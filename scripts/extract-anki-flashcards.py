from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sqlite3
import tempfile
import zipfile
from pathlib import Path


SUBJECT_HINTS = [
    ("biologia", ("bio", "biologia", "fisiologia", "genetica", "genética", "vegetal", "animal", "celula", "célula", "digestorio", "digestório", "botanica", "botânica", "ecologia")),
    ("quimica", ("quim", "química", "quimica", "isomeria", "organica", "orgânica", "alcan", "atom", "átom", "estequiometria", "ph", "ácido", "acido", "base")),
    ("fisica", ("fis", "física", "fisica", "mecanica", "mecânica", "eletric", "onda", "termologia", "cinematica", "cinemática", "dinamica", "dinâmica")),
    ("matematica", ("mat", "matemática", "matematica", "probabilidade", "função", "funcao", "geometria", "trigonometria", "logaritmo", "estatistica", "estatística")),
    ("historia", ("hist", "história", "historia", "brasil", "republica", "república", "idade-media", "idade_média")),
    ("geografia", ("geo", "geografia", "clima", "relevo", "cartografia", "urbanizacao", "urbanização")),
    ("filosofia", ("filo", "filosofia")),
    ("sociologia", ("socio", "sociologia")),
    ("portugues", ("port", "português", "portugues", "gramatica", "gramática", "literatura", "redacao", "redação")),
]


def clean_text(value: str) -> str:
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"</(div|p|li)>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]+>", "", value)
    value = re.sub(r"\[sound:[^\]]+\]", "", value)
    value = re.sub(r"\s*\n\s*", "\n", html.unescape(value))
    return re.sub(r"[ \t]+", " ", value).strip()


def normalize(value: str) -> str:
    value = html.unescape(value).lower()
    value = re.sub(r"<[^>]+>", " ", value)
    return value.replace("_", " ").replace("-", " ")


def infer_subject(*parts: str) -> str:
    haystack = " ".join(normalize(part or "") for part in parts)
    for subject, hints in SUBJECT_HINTS:
        if any(hint in haystack for hint in hints):
            return subject
    return "ciencias-da-natureza"


def cloze_question(text: str) -> str:
    def replace(match: re.Match[str]) -> str:
        hint = match.group(3)
        return f"____ ({clean_text(hint)})" if hint else "____"

    return re.sub(r"\{\{c\d+::(.*?)(::(.*?))?\}\}", replace, text)


def cloze_answer(text: str) -> str:
    return re.sub(r"\{\{c\d+::(.*?)(::.*?)?\}\}", r"\1", text)


def relative_source(package: Path, root: Path | None) -> str:
    try:
        return str(package.relative_to(root)) if root else package.name
    except ValueError:
        return package.name


def extract_package(package: Path, root: Path | None = None) -> list[dict[str, str]]:
    relative = relative_source(package, root)
    records: list[dict[str, str]] = []

    with tempfile.TemporaryDirectory() as temp_dir:
        target = Path(temp_dir) / "collection.db"
        with zipfile.ZipFile(package) as archive:
            database_name = next(
                (name for name in ("collection.anki21", "collection.anki2") if name in archive.namelist()),
                None,
            )
            if not database_name:
                return records
            target.write_bytes(archive.read(database_name))

        connection = sqlite3.connect(str(target))
        try:
            decks_raw, models_raw = connection.execute("SELECT decks, models FROM col LIMIT 1").fetchone()
            decks = json.loads(decks_raw)
            models = json.loads(models_raw)
            rows = connection.execute(
                """
                SELECT n.id, n.mid, n.flds, n.tags, MIN(c.did)
                FROM notes n
                LEFT JOIN cards c ON c.nid = n.id
                GROUP BY n.id, n.mid, n.flds, n.tags
                """
            )
            for note_id, model_id, fields, tags, deck_id in rows:
                model = models.get(str(model_id), {})
                model_name = model.get("name", "")
                if "image occlusion" in model_name.lower():
                    continue
                deck_name = decks.get(str(deck_id), {}).get("name", package.stem) if deck_id else package.stem
                values = [clean_text(value) for value in fields.split("\x1f")]
                raw_values = fields.split("\x1f")
                values = [value for value in values if value and not value.startswith("<!--")]
                if len(values) < 2:
                    continue
                if "cloze" in model_name.lower():
                    front = clean_text(cloze_question(raw_values[0]))
                    answer = clean_text(cloze_answer(raw_values[0]))
                    extra = values[1] if len(values) > 1 else ""
                    back = "\n".join(part for part in (answer, extra) if part)
                else:
                    front, back = values[0], values[1]
                if front == back:
                    continue
                if len(front) < 8 or len(back) < 2:
                    continue
                subject = infer_subject(tags, deck_name, model_name, front, back, package.stem)
                deck = deck_name.replace("::", " / ")
                digest = hashlib.sha256(
                    f"{subject}|{deck}|{front}|{back}".encode("utf-8")
                ).hexdigest()
                records.append(
                    {
                        "id": digest,
                        "ankiNoteId": str(note_id),
                        "subject": subject,
                        "deck": deck,
                        "front": front,
                        "back": back,
                        "tags": tags.strip(),
                        "sourceFile": relative.replace("\\", "/"),
                    }
                )
        finally:
            connection.close()
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="Extrai flashcards de pacotes Anki .apkg.")
    parser.add_argument(
        "--root",
        default="data/FLASHCARDS POR MATERIA copy",
        help="Pasta raiz dos arquivos .apkg.",
    )
    parser.add_argument(
        "--package",
        action="append",
        dest="packages",
        help="Arquivo .apkg avulso. Pode ser usado mais de uma vez.",
    )
    parser.add_argument(
        "--output",
        default="data/flashcards/anki-flashcards.json",
        help="Arquivo JSON de saída.",
    )
    args = parser.parse_args()
    root = Path(args.root)
    output = Path(args.output)

    unique: dict[str, dict[str, str]] = {}
    packages = [Path(item) for item in args.packages] if args.packages else sorted(root.rglob("*.apkg"))
    for index, package in enumerate(packages, start=1):
        extraction_root = root if not args.packages else None
        for record in extract_package(package, extraction_root):
            unique[record["id"]] = record
        print(f"[{index}/{len(packages)}] {package}")

    records = sorted(
        unique.values(),
        key=lambda item: (item["subject"], item["deck"], item["front"]),
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(
            {
                "generatedAt": __import__("datetime").datetime.now(
                    __import__("datetime").timezone.utc
                ).isoformat(),
                "packages": len(packages),
                "cards": len(records),
                "items": records,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"packages": len(packages), "cards": len(records), "output": str(output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
