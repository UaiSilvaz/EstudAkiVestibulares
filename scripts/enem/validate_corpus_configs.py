#!/usr/bin/env python3
"""Valida os manifests oficiais do corpus ENEM regular de 2009 a 2016.

O validador não extrai nem publica conteúdo. Ele confere a identidade e os
hashes dos PDFs, o mapa de páginas, a geometria e a sequência impressa das
questões. A leitura dos marcadores aceita tanto ``QUESTÃO 145`` em um único
span quanto ``QUESTÃO`` e ``145`` em spans separados, layouts encontrados nos
cadernos oficiais mais antigos.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Sequence
from urllib.parse import urlparse

try:
    import fitz  # PyMuPDF
except ImportError as error:  # pragma: no cover - mensagem de preflight
    raise SystemExit(
        "PyMuPDF não está instalado. Execute: "
        "python -m pip install -r scripts/enem/requirements.txt"
    ) from error

import corpus_pipeline as corpus


ROOT = Path(__file__).resolve().parents[2]
CONFIG_ROOT = Path(__file__).resolve().parent / "config"
CONFIG_NAME = re.compile(r"^enem-(20\d{2})-dia-([12])\.json$")
FIRST_YEAR = 2009
LAST_YEAR = 2016


@dataclass(frozen=True)
class PrintedMarker:
    number: int
    page: int
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def center_x(self) -> float:
        return (self.x0 + self.x1) / 2


EXPECTED_LAYOUTS: dict[tuple[int, int], dict[str, Any]] = {
    (2009, 1): {
        "top": 35,
        "bottom": 741,
        "left": 20,
        "leftEnd": 284,
        "rightStart": 292,
        "right": 550,
        "fullWidthObjectivePages": [13, 28, 30],
    },
    (2009, 2): {
        "top": 35,
        "bottom": 741,
        "left": 20,
        "leftEnd": 284,
        "rightStart": 292,
        "right": 550,
        "fullWidthObjectivePages": [],
    },
    (2010, 1): {
        "top": 73,
        "bottom": 778,
        "left": 38,
        "leftEnd": 306,
        "rightStart": 312,
        "right": 576,
        "fullWidthObjectivePages": [],
    },
    (2010, 2): {
        "top": 75,
        "bottom": 780,
        "left": 40,
        "leftEnd": 309,
        "rightStart": 315,
        "right": 578,
        "fullWidthObjectivePages": [4, 15, 19],
    },
    (2011, 1): {
        "top": 70,
        "bottom": 740,
        "left": 34,
        "leftEnd": 288,
        "rightStart": 293,
        "right": 549,
        "fullWidthObjectivePages": [3, 21],
    },
    (2011, 2): {
        "top": 101,
        "bottom": 768,
        "left": 40,
        "leftEnd": 295,
        "rightStart": 300,
        "right": 556,
        "fullWidthObjectivePages": [4, 7, 20],
    },
    (2012, 1): {
        "top": 48,
        "bottom": 748,
        "left": 34,
        "leftEnd": 289,
        "rightStart": 294,
        "right": 549,
        "fullWidthObjectivePages": [21, 28],
    },
    (2012, 2): {
        "top": 48,
        "bottom": 748,
        "left": 34,
        "leftEnd": 289,
        "rightStart": 294,
        "right": 549,
        "fullWidthObjectivePages": [6, 8],
    },
    (2013, 1): {
        "top": 50,
        "bottom": 748,
        "left": 34,
        "leftEnd": 289,
        "rightStart": 294,
        "right": 549,
        "fullWidthObjectivePages": [2, 13, 24, 25, 29, 30],
    },
    (2013, 2): {
        "top": 50,
        "bottom": 748,
        "left": 34,
        "leftEnd": 289,
        "rightStart": 294,
        "right": 549,
        # A página 6 é híbrida: 94/95 em colunas, 96 em largura total abaixo.
        "fullWidthObjectivePages": [3, 6, 21],
    },
    (2014, 1): {
        "top": 50,
        "bottom": 748,
        "left": 34,
        "leftEnd": 289,
        "rightStart": 294,
        "right": 549,
        "fullWidthObjectivePages": [2, 6, 9, 13, 18, 21, 24],
    },
    (2014, 2): {
        "top": 50,
        "bottom": 748,
        "left": 34,
        "leftEnd": 289,
        "rightStart": 294,
        "right": 549,
        "fullWidthObjectivePages": [3],
    },
    (2015, 1): {
        "top": 50,
        "bottom": 748,
        "left": 34,
        "leftEnd": 289,
        "rightStart": 294,
        "right": 549,
        "fullWidthObjectivePages": [5, 10, 13, 31],
    },
    (2015, 2): {
        "top": 50,
        "bottom": 748,
        "left": 34,
        "leftEnd": 289,
        "rightStart": 294,
        "right": 549,
        "fullWidthObjectivePages": [],
    },
    (2016, 1): {
        "top": 75,
        "bottom": 772,
        "left": 57,
        "leftEnd": 312,
        "rightStart": 317,
        "right": 572,
        "fullWidthObjectivePages": [6, 12, 15, 17, 18, 26, 27, 28, 30],
    },
    (2016, 2): {
        "top": 75,
        "bottom": 772,
        "left": 57,
        "leftEnd": 312,
        "rightStart": 317,
        "right": 572,
        "fullWidthObjectivePages": [18, 22],
    },
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def strict_object(pairs: Sequence[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, item in pairs:
        if key in value:
            raise ValueError(f"chave JSON duplicada: {key}")
        value[key] = item
    return value


def read_config(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(
            path.read_text(encoding="utf-8"),
            object_pairs_hook=strict_object,
        )
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError) as error:
        raise ValueError(f"JSON inválido: {error}") from error
    require(isinstance(raw, dict), "a raiz do manifest deve ser um objeto JSON")
    loaded, loaded_path = corpus.load_config(str(path))
    require(loaded_path.resolve() == path.resolve(), "load_config resolveu outro arquivo")
    require(raw == loaded, "leitura estrita divergiu de load_config")
    return raw


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def official_host(value: str) -> bool:
    host = (urlparse(value).hostname or "").lower()
    return host == "gov.br" or host.endswith(".gov.br")


def expected_page_roles(year: int, day: int) -> dict[str, list[Any] | int]:
    if day == 2:
        return {
            "pageCount": 33 if year == 2011 else 32,
            "objectivePageRanges": [{"start": 3, "end": 31}],
            "essayPages": [2],
            "draftPages": [32],
            "administrativePages": [33] if year == 2011 else [],
            "errataPages": [33] if year == 2011 else [],
        }
    objective_end = 30 if year == 2010 else 31
    administrative = [31, 32] if year == 2010 else [32]
    return {
        "pageCount": 32,
        "objectivePageRanges": [{"start": 2, "end": objective_end}],
        "essayPages": [],
        "draftPages": [],
        "administrativePages": administrative,
        "errataPages": [],
    }


def expected_languages(year: int, day: int) -> list[dict[str, Any]]:
    # O ENEM passou a cobrar língua estrangeira em 2010. O 2º dia de 2009
    # contém 90 questões comuns (91–180), sem variantes inglês/espanhol.
    if day != 2 or year == 2009:
        return []
    return [
        {
            "language": "ingles",
            "questionStart": 91,
            "questionEnd": 95,
            "occurrenceIndex": 1,
            "answerColumnOrder": 1,
        },
        {
            "language": "espanhol",
            "questionStart": 91,
            "questionEnd": 95,
            "occurrenceIndex": 2,
            "answerColumnOrder": 2,
        },
    ]


def validate_static_mapping(config: dict[str, Any], path: Path) -> None:
    match = CONFIG_NAME.fullmatch(path.name)
    require(match is not None, f"nome de arquivo inesperado: {path.name}")
    filename_year, filename_day = int(match.group(1)), int(match.group(2))
    year, day = int(config["year"]), int(config["day"])
    require((year, day) == (filename_year, filename_day), "ano/dia divergem do nome")
    require(FIRST_YEAR <= year <= LAST_YEAR, "ano fora do escopo 2009–2016")
    require(config.get("schemaVersion") == 1, "schemaVersion deve ser 1")
    require(config.get("vestibular") == "ENEM", "vestibular deve ser ENEM")
    require(config.get("application") == "regular", "aplicação deve ser regular")
    require(config.get("applicationLabel") == "1ª Aplicação", "rótulo da aplicação inválido")
    require(config.get("modality") == "impressa", "modalidade deve ser impressa")

    if day == 1:
        booklet_number, booklet_color = 1, "Azul"
        question_start, question_end = 1, 90
    elif year == 2009:
        booklet_number, booklet_color = 7, "Azul"
        question_start, question_end = 91, 180
    else:
        booklet_number, booklet_color = 5, "Amarelo"
        question_start, question_end = 91, 180
    slug_color = corpus.pilot.normalize_ascii(booklet_color)
    expected_id = (
        f"enem-{year}-dia-{day}-caderno-{booklet_number}-{slug_color}"
    )
    require(config["id"] == expected_id, "id canônico incorreto")
    require(config["bookletNumber"] == booklet_number, "número do caderno incorreto")
    require(config["bookletColor"] == booklet_color, "cor do caderno incorreta")
    require(config["questionStart"] == question_start, "questionStart incorreto")
    require(config["questionEnd"] == question_end, "questionEnd incorreto")
    require(config["expectedLogicalQuestions"] == 90, "devem existir 90 questões lógicas")
    printed = 95 if day == 2 and year >= 2010 else 90
    require(config["expectedPrintedOccurrences"] == printed, "ocorrências impressas incorretas")
    require(config.get("oldExamId") == f"pa-enem-{year}-dia-{day}", "oldExamId incorreto")
    require(
        config["outputDirectory"]
        == f"data/QUESTÕES/processamento/{expected_id}",
        "outputDirectory não é o diretório canônico",
    )

    roles = expected_page_roles(year, day)
    require(config.get("pdfPageCount") == roles["pageCount"], "pdfPageCount incorreto")
    for field in (
        "objectivePageRanges",
        "essayPages",
        "draftPages",
        "administrativePages",
    ):
        require(config.get(field, []) == roles[field], f"{field} incorreto")
    require(config.get("errataPages", []) == roles["errataPages"], "errataPages incorreto")
    require(config.get("layout") == EXPECTED_LAYOUTS[(year, day)], "layout diverge do mapa inspecionado")
    require(config.get("languageSections") == expected_languages(year, day), "variantes de idioma incorretas")
    require(config.get("commonLanguage") == "portugues", "commonLanguage deve ser portugues")
    annulled = [101] if (year, day) == (2009, 2) else []
    require(config.get("expectedAnnulled", []) == annulled, "anulações esperadas incorretas")

    areas = config.get("areas", [])
    if day == 2:
        expected_area_names = ["linguagens, codigos e suas tecnologias", "matematica e suas tecnologias"]
        expected_area_ranges = [(91, 135), (136, 180)]
    elif year == 2009:
        expected_area_names = ["ciencias da natureza e suas tecnologias", "ciencias humanas e suas tecnologias"]
        expected_area_ranges = [(1, 45), (46, 90)]
    else:
        expected_area_names = ["ciencias humanas e suas tecnologias", "ciencias da natureza e suas tecnologias"]
        expected_area_ranges = [(1, 45), (46, 90)]
    require(len(areas) == 2, "o manifest deve declarar duas áreas")
    require(
        [corpus.pilot.normalize_ascii(item.get("name", "")) for item in areas]
        == expected_area_names,
        "nomes/ordem das áreas incorretos",
    )
    require(
        [(item.get("questionStart"), item.get("questionEnd")) for item in areas]
        == expected_area_ranges,
        "intervalos das áreas incorretos",
    )

    for field in ("officialSourcePage", "officialExamUrl", "officialAnswerKeyUrl"):
        value = config.get(field)
        require(isinstance(value, str) and official_host(value), f"{field} não aponta para domínio oficial")
        require(str(year) in value, f"{field} não identifica o ano {year}")
    for field in ("officialExamPdf", "officialAnswerKeyPdf"):
        value = Path(config[field])
        require(value.parts[:3] == ("data", "provas", "enem"), f"{field} fora de data/provas/enem")
        require(len(value.parts) >= 4 and value.parts[3] == str(year), f"{field} no diretório de ano incorreto")


def clean_word(value: str) -> str:
    normalized = corpus.pilot.normalize_ascii(value).lower()
    return normalized.strip().strip(":.;,–—-")


def markers_on_page(page: fitz.Page) -> list[PrintedMarker]:
    words = page.get_text("words", sort=True)
    markers: list[PrintedMarker] = []
    for index, word in enumerate(words):
        token = clean_word(str(word[4]))
        combined = re.fullmatch(r"questao0*(\d{1,3})", token)
        if combined:
            markers.append(
                PrintedMarker(
                    int(combined.group(1)),
                    page.number + 1,
                    float(word[0]),
                    float(word[1]),
                    float(word[2]),
                    float(word[3]),
                )
            )
            continue
        if token != "questao" or index + 1 >= len(words):
            continue
        number_word = words[index + 1]
        number_token = clean_word(str(number_word[4]))
        if not re.fullmatch(r"0*\d{1,3}", number_token):
            continue
        same_block = number_word[5] == word[5]
        same_row = number_word[6] == word[6] or abs(number_word[1] - word[1]) < 20
        if not (same_block and same_row):
            continue
        markers.append(
            PrintedMarker(
                int(number_token),
                page.number + 1,
                min(float(word[0]), float(number_word[0])),
                min(float(word[1]), float(number_word[1])),
                max(float(word[2]), float(number_word[2])),
                max(float(word[3]), float(number_word[3])),
            )
        )
    return markers


def expected_printed_sequence(config: dict[str, Any]) -> list[int]:
    sections = sorted(config["languageSections"], key=lambda item: item["occurrenceIndex"])
    if not sections:
        return list(range(config["questionStart"], config["questionEnd"] + 1))
    sequence: list[int] = []
    for section in sections:
        sequence.extend(range(section["questionStart"], section["questionEnd"] + 1))
    first_common = max(item["questionEnd"] for item in sections) + 1
    sequence.extend(range(first_common, config["questionEnd"] + 1))
    return sequence


def block_crosses_gutter(page: fitz.Page, layout: dict[str, Any]) -> bool:
    content = fitz.Rect(0, layout["top"], page.rect.width, layout["bottom"])
    for block in page.get_text("blocks"):
        rect = fitz.Rect(*block[:4])
        if (rect & content).is_empty:
            continue
        if rect.x0 < layout["leftEnd"] - 2 and rect.x1 > layout["rightStart"] + 2:
            return True
    return False


def validate_exam_pdf(config: dict[str, Any], exam_path: Path) -> tuple[int, int]:
    corpus.validate_pdf(exam_path)
    document = fitz.open(exam_path)
    try:
        require(document.page_count == config["pdfPageCount"], "paginação real diverge de pdfPageCount")
        corpus.validate_exam_identity(config, document)
        objective_pages = corpus.page_numbers_from_ranges(config["objectivePageRanges"])
        objective_set = set(objective_pages)
        essay = {int(value) for value in config.get("essayPages", [])}
        draft = {int(value) for value in config.get("draftPages", [])}
        administrative = {int(value) for value in config.get("administrativePages", [])}
        role_sets = [objective_set, essay, draft, administrative]
        require(
            sum(len(values) for values in role_sets) == len(set().union(*role_sets)),
            "papéis de página se sobrepõem",
        )
        require(
            {1}.union(*role_sets) == set(range(1, document.page_count + 1)),
            "mapa de páginas não cobre exatamente o PDF (capa = página 1)",
        )
        require(set(config.get("errataPages", [])).issubset(administrative), "errata deve ser página administrativa")

        layout = config["layout"]
        full_width = set(layout["fullWidthObjectivePages"])
        require(full_width.issubset(objective_set), "página full-width fora do intervalo objetivo")
        markers: list[PrintedMarker] = []
        pages_with_markers: set[int] = set()
        for page_number in objective_pages:
            page = document[page_number - 1]
            require(
                0 <= layout["left"] < layout["leftEnd"] < layout["rightStart"] < layout["right"] <= page.rect.width,
                f"geometria horizontal inválida na página {page_number}",
            )
            require(
                0 <= layout["top"] < layout["bottom"] <= page.rect.height,
                f"geometria vertical inválida na página {page_number}",
            )
            own = [
                marker
                for marker in markers_on_page(page)
                if config["questionStart"] <= marker.number <= config["questionEnd"]
            ]
            if own:
                pages_with_markers.add(page_number)
            markers.extend(own)
            for marker in own:
                require(
                    layout["left"] - 1 <= marker.x0
                    and marker.x1 <= layout["right"] + 1
                    and layout["top"] - 1 <= marker.y0
                    and marker.y1 <= layout["bottom"] + 1,
                    f"marcador da questão {marker.number} fora da geometria na página {page_number}",
                )
        require(pages_with_markers == objective_set, "há página objetiva sem marcador de questão")

        counts = Counter(marker.number for marker in markers)
        expected_numbers = set(range(config["questionStart"], config["questionEnd"] + 1))
        require(set(counts) == expected_numbers, "conjunto de números detectados diverge do intervalo oficial")
        for number in expected_numbers:
            variants = [
                section
                for section in config["languageSections"]
                if section["questionStart"] <= number <= section["questionEnd"]
            ]
            expected_count = len(variants) if variants else 1
            require(
                counts[number] == expected_count,
                f"questão {number}: {counts[number]} ocorrências; esperado {expected_count}",
            )
        require(len(markers) == config["expectedPrintedOccurrences"], "total de marcadores impressos incorreto")

        split = (layout["leftEnd"] + layout["rightStart"]) / 2
        ordered = sorted(
            markers,
            key=lambda marker: (
                marker.page,
                0 if marker.page in full_width or marker.center_x < split else 1,
                marker.y0,
                marker.x0,
            ),
        )
        actual_sequence = [marker.number for marker in ordered]
        expected_sequence = expected_printed_sequence(config)
        require(
            actual_sequence == expected_sequence,
            f"ordem impressa divergente: detectada={actual_sequence}; esperada={expected_sequence}",
        )
        for page_number in full_width:
            require(
                block_crosses_gutter(document[page_number - 1], layout),
                f"página {page_number} declarada full-width sem bloco que atravesse o gutter",
            )

        if config["day"] == 2:
            essay_page = document[config["essayPages"][0] - 1]
            essay_text = corpus.pilot.normalize_ascii(essay_page.get_text("text"))
            require(
                "redacao" in essay_text or bool(essay_page.get_images(full=True)),
                "página da proposta de redação sem evidência textual ou visual",
            )
            draft_page = document[config["draftPages"][0] - 1]
            draft_text = corpus.pilot.normalize_ascii(draft_page.get_text("text"))
            require("redacao" in draft_text, "página de rascunho não identificada")
            if config["year"] >= 2010:
                objective_text = corpus.pilot.normalize_ascii(
                    "\n".join(document[number - 1].get_text("text") for number in objective_pages)
                )
                require("ingles" in objective_text and "espanhol" in objective_text, "seções inglês/espanhol não identificadas")
        return len(expected_numbers), len(markers)
    finally:
        document.close()


def validate_answer_key_pdf(config: dict[str, Any], key_path: Path) -> None:
    corpus.validate_pdf(key_path)
    document = fitz.open(key_path)
    try:
        raw_text = "\n".join(page.get_text("text") for page in document)
        normalized = corpus.pilot.normalize_ascii(raw_text)
        booklet = re.search(rf"caderno\s+0?{config['bookletNumber']}\b", normalized)
        require(bool(booklet), "gabarito não identifica o número do caderno")
        require(
            corpus.pilot.normalize_ascii(config["bookletColor"]) in normalized,
            "gabarito não identifica a cor do caderno",
        )
        day_by_label = corpus.text_identifies_day(raw_text, config["day"])
        if config["day"] == 1:
            day_by_areas = "ciencias humanas" in normalized and "ciencias da natureza" in normalized
        else:
            day_by_areas = "linguagens" in normalized and "matematica" in normalized
        require(day_by_label or day_by_areas, "gabarito não contém evidência do dia/áreas")

        numeric_tokens = {
            int(word[4])
            for page in document
            for word in page.get_text("words")
            if re.fullmatch(r"0?\d{1,3}", str(word[4]).strip())
            and 1 <= int(word[4]) <= 180
        }
        expected = set(range(config["questionStart"], config["questionEnd"] + 1))
        require(expected.issubset(numeric_tokens), "gabarito não contém toda a numeração oficial")
        if config["languageSections"]:
            require("ingles" in normalized and "espanhol" in normalized, "colunas de idioma ausentes no gabarito")
        annulments = len(re.findall(r"anulad[oa]", normalized))
        if config["expectedAnnulled"]:
            require(annulments > 0, "anulação esperada não aparece no PDF oficial")
            for number in config["expectedAnnulled"]:
                require(
                    re.search(rf"\b0?{number}\s+anulad[oa]\b", normalized) is not None,
                    f"questão anulada {number} não localizada no gabarito",
                )
        else:
            require(annulments == 0, "gabarito contém anulação não declarada no manifest")
    finally:
        document.close()


def validate_one(path: Path) -> dict[str, Any]:
    config = read_config(path)
    validate_static_mapping(config, path)
    exam_path = corpus.repo_path(config["officialExamPdf"])
    key_path = corpus.repo_path(config["officialAnswerKeyPdf"])
    require(exam_path.is_file(), f"PDF da prova ausente: {exam_path}")
    require(key_path.is_file(), f"PDF do gabarito ausente: {key_path}")
    exam_hash = sha256_file(exam_path)
    key_hash = sha256_file(key_path)
    require(exam_hash == config.get("officialExamSha256"), "SHA-256 da prova diverge")
    require(key_hash == config.get("officialAnswerKeySha256"), "SHA-256 do gabarito diverge")
    logical, printed = validate_exam_pdf(config, exam_path)
    validate_answer_key_pdf(config, key_path)
    return {
        "id": config["id"],
        "year": config["year"],
        "day": config["day"],
        "pages": config["pdfPageCount"],
        "logicalQuestions": logical,
        "printedOccurrences": printed,
        "examSha256": exam_hash,
        "answerKeySha256": key_hash,
    }


def default_paths() -> list[Path]:
    paths = [
        CONFIG_ROOT / f"enem-{year}-dia-{day}.json"
        for year in range(FIRST_YEAR, LAST_YEAR + 1)
        for day in (1, 2)
    ]
    missing = [str(path) for path in paths if not path.is_file()]
    require(not missing, f"manifests ausentes: {missing}")
    return paths


def selected_paths(values: Iterable[str]) -> list[Path]:
    paths: list[Path] = []
    for value in values:
        candidate = Path(value)
        if not candidate.is_absolute():
            candidate = ROOT / candidate
        paths.append(candidate.resolve())
    return paths or default_paths()


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "configs",
        nargs="*",
        help="Manifests específicos; por padrão valida os 16 arquivos de 2009–2016.",
    )
    parser.add_argument("--json", action="store_true", help="Emite o resumo em JSON.")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        paths = selected_paths(args.configs)
    except ValueError as error:
        print(f"ERRO: {error}", file=sys.stderr)
        return 1
    results: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []
    for path in paths:
        try:
            result = validate_one(path)
            results.append(result)
            if not args.json:
                print(
                    f"OK {result['year']}/D{result['day']} "
                    f"páginas={result['pages']} lógicas={result['logicalQuestions']} "
                    f"impressas={result['printedOccurrences']}"
                )
        except Exception as error:  # mantém a auditoria dos demais manifests
            failures.append({"config": path.as_posix(), "error": str(error)})
            if not args.json:
                print(f"FALHA {path.name}: {error}", file=sys.stderr)
    payload = {
        "status": "ok" if not failures else "failed",
        "scope": {"firstYear": FIRST_YEAR, "lastYear": LAST_YEAR},
        "validatedConfigs": len(results),
        "expectedConfigs": len(paths),
        "logicalQuestions": sum(item["logicalQuestions"] for item in results),
        "printedOccurrences": sum(item["printedOccurrences"] for item in results),
        "results": results,
        "failures": failures,
    }
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    elif not failures:
        print(
            f"VALIDAÇÃO CONCLUÍDA: {len(results)}/{len(paths)} manifests; "
            f"{payload['logicalQuestions']} questões lógicas; "
            f"{payload['printedOccurrences']} ocorrências impressas."
        )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
