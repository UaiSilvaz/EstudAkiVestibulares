import assert from "node:assert/strict";
import test from "node:test";
import { OfficialQuestionLanguage } from "@prisma/client";
import {
  corpusLanguage,
  stableQuestionHash,
  type CorpusQuestion,
} from "./corpus-importer-core";

test("mapeia variantes oficiais e mantém questões comuns fora da seleção de língua", () => {
  assert.equal(corpusLanguage("ingles"), OfficialQuestionLanguage.ENGLISH);
  assert.equal(corpusLanguage("SPANISH"), OfficialQuestionLanguage.SPANISH);
  assert.equal(corpusLanguage("portugues"), OfficialQuestionLanguage.NOT_APPLICABLE);
  assert.equal(corpusLanguage("comum"), OfficialQuestionLanguage.NOT_APPLICABLE);
  assert.throws(() => corpusLanguage("frances"), /Idioma oficial desconhecido/);
});

test("hash semântico ignora somente timestamps voláteis de extração", () => {
  const base = {
    id: "enem-2022-dia-1-q001-ingles",
    source: { accessedAt: "2026-07-18T00:00:00Z" },
    officialAnswerKey: { importedAt: "2026-07-18T00:00:00Z" },
    extraction: { generatedAt: "2026-07-18T00:00:00Z" },
    command: "Comando",
  } as unknown as CorpusQuestion;
  const regenerated = {
    ...base,
    source: { ...base.source, accessedAt: "2026-07-19T00:00:00Z" },
    officialAnswerKey: {
      ...base.officialAnswerKey,
      importedAt: "2026-07-19T00:00:00Z",
    },
    extraction: { ...base.extraction, generatedAt: "2026-07-19T00:00:00Z" },
  } as CorpusQuestion;
  assert.equal(stableQuestionHash(base), stableQuestionHash(regenerated));
  assert.notEqual(
    stableQuestionHash(base),
    stableQuestionHash({ ...regenerated, command: "Comando alterado" }),
  );
});
