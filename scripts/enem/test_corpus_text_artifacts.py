#!/usr/bin/env python3
"""Regressões da limpeza estrita de resíduos da camada textual oficial."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


SCRIPT_DIRECTORY = Path(__file__).resolve().parent
if str(SCRIPT_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIRECTORY))

import corpus_pipeline as corpus  # noqa: E402


class CorpusTextArtifactCleanupTest(unittest.TestCase):
    def test_removes_only_source_verified_terminal_residues(self) -> None:
        cases = (
            (
                "década de 1970, aqui representado peloi",
                "década de 1970, aqui representado pelo",
            ),
            (
                "os limites do potencial inclusivo do esporte são dados pelai",
                "os limites do potencial inclusivo do esporte são dados pela",
            ),
            (
                "uma nova função e está correlacionado ao(à)i",
                "uma nova função e está correlacionado ao(à)",
            ),
            (
                "infere-se que esse preconceito se devei",
                "infere-se que esse preconceito se deve",
            ),
            (
                "narrativas do cotidiano de origem e de destino.il",
                "narrativas do cotidiano de origem e de destino.",
            ),
        )
        for source, expected in cases:
            with self.subTest(source=source):
                cleaned, corrections = corpus.clean_pdf_text_artifacts(source)
                self.assertEqual(cleaned, expected)
                self.assertEqual(len(corrections), 1)
                self.assertEqual(
                    corrections[0]["reason"], "invisible_pdf_text_layer_suffix"
                )

    def test_restores_source_verified_space_after_closing_quote(self) -> None:
        source = "a expressão “No man is an island”ressalta o(a)"
        expected = "a expressão “No man is an island” ressalta o(a)"
        cleaned, corrections = corpus.clean_pdf_text_artifacts(source)
        self.assertEqual(cleaned, expected)
        self.assertEqual(len(corrections), 1)
        self.assertEqual(
            corrections[0]["reason"],
            "missing_space_after_closing_quote_in_pdf_text_layer",
        )

    def test_preserves_legitimate_endings_and_spacing(self) -> None:
        values = (
            "aqui representado pelo",
            "os limites são dados pela",
            "está correlacionado ao(à)",
            "esse preconceito se deve",
            "origem e destino.",
            "a expressão “No man is an island” ressalta o(a)",
            "Disponível em: https://exemplo.org/perfil",
        )
        for value in values:
            with self.subTest(value=value):
                self.assertEqual(corpus.clean_pdf_text_artifacts(value), (value, []))

    def test_structures_essay_without_administrative_header(self) -> None:
        raw = """19
–LC • 1º DIA • CADERNO 2 • AMARELO–
*010275AM19*
INSTRUÇÕES PARA A REDAÇÃO
1. Faça o rascunho no espaço apropriado.
TEXTO I
Primeiro texto motivador.
Disponível em: https://fonte-1.example.
TEXTO II
Segundo texto motivador.
Fonte: Instituto oficial.
PROPOSTA DE REDAÇÃO
Escreva sobre o tema proposto.
TEXTO III
Terceiro texto motivador.
TEXTO IV
Quarto texto motivador.
Disponível em: https://fonte-4.example.
"""
        instructions = corpus.clean_essay_instructions(raw)
        self.assertEqual(
            instructions,
            "INSTRUÇÕES PARA A REDAÇÃO\n1. Faça o rascunho no espaço apropriado.",
        )
        motivating = corpus.structure_essay_motivating_texts(raw, [19])
        self.assertEqual([item["label"] for item in motivating], [
            "TEXTO I",
            "TEXTO II",
            "TEXTO III",
            "TEXTO IV",
        ])
        self.assertEqual([item["order"] for item in motivating], [0, 1, 2, 3])
        self.assertNotIn("PROPOSTA DE REDAÇÃO", motivating[1]["content"])
        self.assertEqual(
            motivating[0]["creditText"],
            "Disponível em: https://fonte-1.example.",
        )
        self.assertEqual(motivating[2]["creditText"], None)
        self.assertTrue(all(item["sourcePdfPages"] == [19] for item in motivating))


if __name__ == "__main__":
    unittest.main()
