import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOldExamLanguage, selectOldExamLanguageLinks } from "./old-exam-language";

const links = [
  { id: "en-1", numeroQuestao: 1, ordem: 1, officialLanguage: "ENGLISH" as const },
  { id: "es-1", numeroQuestao: 1, ordem: 1, officialLanguage: "SPANISH" as const },
  { id: "common-6", numeroQuestao: 6, ordem: 6, officialLanguage: "NOT_APPLICABLE" as const },
  { id: "common-7", numeroQuestao: 7, ordem: 7, officialLanguage: "NOT_APPLICABLE" as const },
];

test("keeps common questions and only the selected language variant", () => {
  const selection = selectOldExamLanguageLinks(links, "SPANISH");

  assert.equal(selection.selectedLanguage, "SPANISH");
  assert.deepEqual(selection.availableLanguages, ["ENGLISH", "SPANISH"]);
  assert.deepEqual(selection.links.map((link) => link.id), ["es-1", "common-6", "common-7"]);
});

test("sorts by official booklet order even when database input is scrambled", () => {
  const scrambled = [
    { id: "q-12", numeroQuestao: 12, ordem: 3, officialLanguage: "NOT_APPLICABLE" as const },
    { id: "q-es", numeroQuestao: 10, ordem: 1, officialLanguage: "SPANISH" as const },
    { id: "q-en", numeroQuestao: 10, ordem: 1, officialLanguage: "ENGLISH" as const },
    { id: "q-11", numeroQuestao: 11, ordem: 2, officialLanguage: "NOT_APPLICABLE" as const },
  ];

  const selection = selectOldExamLanguageLinks(scrambled, "ENGLISH");

  assert.deepEqual(selection.links.map((link) => link.id), ["q-en", "q-11", "q-12"]);
});

test("preserves exams without language variants", () => {
  const commonOnly = links.filter((link) => link.officialLanguage === "NOT_APPLICABLE");
  const selection = selectOldExamLanguageLinks(commonOnly, "ENGLISH");

  assert.equal(selection.selectedLanguage, null);
  assert.deepEqual(selection.availableLanguages, []);
  assert.deepEqual(selection.links.map((link) => link.id), ["common-6", "common-7"]);
});

test("normalizes supported query values and rejects unsupported ones", () => {
  assert.equal(parseOldExamLanguage(" english "), "ENGLISH");
  assert.equal(parseOldExamLanguage(["SPANISH", "ENGLISH"]), "SPANISH");
  assert.equal(parseOldExamLanguage("PORTUGUESE"), null);
});
