#!/usr/bin/env python3
"""Regressão dos gabaritos oficiais ENEM regular de 2009 a 2016."""

from __future__ import annotations

import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path


SCRIPT_ROOT = Path(__file__).resolve().parent
ROOT = SCRIPT_ROOT.parents[1]
sys.path.insert(0, str(SCRIPT_ROOT))

import corpus_pipeline as corpus  # noqa: E402


EXPECTED = {
    (2009, 1): (90, "cd63f452843c6d2e07abc0968c27ca893676fce9ed47050148465a995c6c33cf"),
    (2009, 2): (90, "2cd99338dc6b61e308c9d911aeca4fcc05e84b35832a5b8863833f1db375977c"),
    (2010, 1): (90, "40afa258295d18fef73ae2cb8da120001a235a7c06486c9abc133c240ad01b6c"),
    (2010, 2): (95, "f244ae0a94feeb84040bf0dcce4aff11f0ab0a389a0b271f6f1f21a76871dda5"),
    (2011, 1): (90, "bcdcd6f953333c4dad596b6c5386457879c6e68f518c851cb8748a8b6bf54ff8"),
    (2011, 2): (95, "2f8a5ec98cbc96f8b8a3ff33b02855e4adb08d815e393a367649f4f4972b2dcc"),
    (2012, 1): (90, "521fe2c2c9965b9fdb7ee0b28216f64384d2d564865654755add1487863d5722"),
    (2012, 2): (95, "100dd494c4c261d88596f426ee5273429e4181a99819fc0d9b00fe4f85c2b63d"),
    (2013, 1): (90, "e106748b8f70e6a407e2a6bb55fa45b8f3c99b5cb208b5aa43db9aa1f26612d6"),
    (2013, 2): (95, "5364cfc27d84eb8b7ee6a05c78a28f8837082efa58f85f7e1efe4973da8abc1a"),
    (2014, 1): (90, "6fed69a9c367ec1b4c871a194cd6f79f7cae9dfe1e0387f05bef9f9ab40f5cc9"),
    (2014, 2): (95, "da6230d20d87a0042bfce589aa73706358da5ac548498810039dd2255655c478"),
    (2015, 1): (90, "6b079cfed29bf98f7a29e314a10eb4e2c5a581e7719cdee0feeca7a19a1877b7"),
    (2015, 2): (95, "32356f96e17f7718cab6bec8c2c168c24e355a89a4c335f204fb70fb941b2fca"),
    (2016, 1): (90, "c50eb64831d1cff567b18e7916d56a6239fe14bc82a6503a601291623d903526"),
    (2016, 2): (95, "3f5ae230c08cf22059a466172ed37394004c85e3ca248c9eb2798a0c29f7ff18"),
}


def answer_digest(answers: list[dict[str, object]]) -> str:
    canonical = [
        (
            item["questionNumber"],
            item["language"],
            item["correctAlternative"],
            item["situation"],
        )
        for item in answers
    ]
    return hashlib.sha256(
        json.dumps(
            canonical,
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()


class OfficialAnswerKeys2009To2016Test(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.results: dict[
            tuple[int, int],
            tuple[dict[str, object], list[dict[str, object]], dict[str, object]],
        ] = {}
        for year, day in EXPECTED:
            config, _ = corpus.load_config(f"enem-{year}-dia-{day}")
            answers, trace = corpus.parse_official_answer_key(
                config,
                corpus.repo_path(config["officialAnswerKeyPdf"]),
            )
            cls.results[(year, day)] = (config, answers, trace)

    def test_all_sixteen_official_pdfs_match_golden_digests(self) -> None:
        total = 0
        for key, (expected_count, expected_digest) in EXPECTED.items():
            config, answers, trace = self.results[key]
            self.assertEqual(len(answers), expected_count, key)
            self.assertEqual(answer_digest(answers), expected_digest, key)
            self.assertEqual(
                len({(item["questionNumber"], item["language"]) for item in answers}),
                expected_count,
                key,
            )
            self.assertTrue(trace["manifestBinding"]["verified"], key)
            self.assertEqual(
                trace["manifestBinding"]["actualSha256"],
                config["officialAnswerKeySha256"],
                key,
            )
            for answer in answers:
                if answer["situation"] == "annulled":
                    self.assertIsNone(answer["correctAlternative"], (key, answer))
                else:
                    self.assertIn(answer["correctAlternative"], "ABCDE", (key, answer))
                self.assertGreaterEqual(int(answer["sourcePdfPage"]), 1)
                self.assertIn("sourceRegion", answer)
                self.assertIn("answerRegion", answer)
            total += len(answers)
        self.assertEqual(total, 1475)

    def test_languages_and_annulment_are_exact(self) -> None:
        for (year, day), (_, answers, _) in self.results.items():
            counts = Counter(item["language"] for item in answers)
            if day == 2 and year >= 2010:
                self.assertEqual(counts, {"ingles": 5, "espanhol": 5, "comum": 85})
            else:
                self.assertEqual(counts, {"comum": 90})
            annulled = sorted(
                item["questionNumber"]
                for item in answers
                if item["situation"] == "annulled"
            )
            self.assertEqual(annulled, [101] if (year, day) == (2009, 2) else [])

    def test_multicolor_and_marked_booklet_samples(self) -> None:
        answers_2009 = {
            (item["questionNumber"], item["language"]): item["correctAlternative"]
            for item in self.results[(2009, 2)][1]
        }
        self.assertEqual(answers_2009[(91, "comum")], "A")
        self.assertIsNone(answers_2009[(101, "comum")])
        self.assertEqual(answers_2009[(102, "comum")], "C")

        answers_2010_d1 = {
            item["questionNumber"]: item["correctAlternative"]
            for item in self.results[(2010, 1)][1]
        }
        self.assertEqual(
            [answers_2010_d1[number] for number in range(1, 5)],
            ["A", "B", "A", "B"],
        )
        answers_2010_d2 = {
            (item["questionNumber"], item["language"]): item["correctAlternative"]
            for item in self.results[(2010, 2)][1]
        }
        self.assertEqual(answers_2010_d2[(91, "ingles")], "A")
        self.assertEqual(answers_2010_d2[(91, "espanhol")], "D")
        self.assertEqual(answers_2010_d2[(180, "comum")], "E")

    def test_missing_embedded_metadata_uses_verified_manifest_hash(self) -> None:
        for key in ((2011, 1), (2011, 2), (2012, 1), (2013, 2), (2014, 1)):
            _, _, trace = self.results[key]
            self.assertTrue(trace["manifestBinding"]["verified"], key)
            self.assertTrue(
                trace["identityChecks"]["manifestHashFallbackUsed"]["year"],
                key,
            )
        for key in ((2011, 1), (2011, 2)):
            _, _, trace = self.results[key]
            self.assertTrue(
                trace["identityChecks"]["manifestHashFallbackUsed"]["day"],
                key,
            )

    def test_same_hash_at_unknown_path_is_rejected(self) -> None:
        config, _, _ = self.results[(2011, 1)]
        source = corpus.repo_path(config["officialAnswerKeyPdf"])
        temporary_root = ROOT / ".codex-tmp"
        temporary_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=temporary_root) as directory:
            copied = Path(directory) / source.name
            shutil.copy2(source, copied)
            self.assertEqual(corpus.sha256_file(copied), config["officialAnswerKeySha256"])
            with self.assertRaisesRegex(ValueError, "vinculo integral ao manifest oficial"):
                corpus.parse_official_answer_key(config, copied)


if __name__ == "__main__":
    unittest.main()
