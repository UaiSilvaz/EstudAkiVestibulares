import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createOldExamProofDraft,
  oldExamProofVisibleImages,
  oldExamProofStorageKey,
  parseOldExamProofDraft,
  toOldExamProofQuestion,
  validateOldExamProofSubmission,
} from "./old-exam-proof";

test("initial proof payload drops every answer and resolution field", () => {
  const source = {
    id: "q1",
    supportText: "Texto de apoio",
    statement: "Comando",
    questionNumber: 1,
    alternatives: [{ key: "A", text: "Alternativa", imageUrl: null }],
    imageUrl: null,
    images: [],
    correctAlternative: "A",
    answerSituation: "CONFIRMED",
    explanation: "Segredo",
    alternativeExplanations: { A: "Segredo" },
    authorialResolutions: [{ fullResolution: "Segredo" }],
  };

  const payload = toOldExamProofQuestion(source);
  const serialized = JSON.stringify(payload);

  assert.deepEqual(Object.keys(payload).sort(), [
    "alternatives",
    "id",
    "imageUrl",
    "images",
    "questionNumber",
    "statement",
    "supportText",
  ]);
  assert.equal(serialized.includes("correctAlternative"), false);
  assert.equal(serialized.includes("answerSituation"), false);
  assert.equal(serialized.includes("Segredo"), false);
});

test("student view keeps structured media and excludes audit facsimiles", () => {
  const question = {
    id: "q1",
    supportText: "Texto digitalizado",
    statement: "Comando digitalizado",
    questionNumber: 1,
    alternatives: [],
    imageUrl: "/visual.png",
    images: [
      { url: "/facsimile.png", assetType: "PROMPT_FACSIMILE", relation: "STATEMENT", order: 0 },
      { url: "/original.png", assetType: "ORIGINAL_REFERENCE", relation: "ADMIN_REFERENCE", order: 1 },
      { url: "/visual.png", assetType: "VISUAL", relation: "STATEMENT", order: 2 },
    ],
  };

  assert.deepEqual(
    oldExamProofVisibleImages(question).map((image) => image.url),
    ["/visual.png"],
  );
});

test("draft stores only student state and restores the official question set", () => {
  const draft = createOldExamProofDraft("exam-1", "SPANISH", ["q-es", "q-6"], 1000);
  draft.answers["q-es"] = "C";
  const restored = parseOldExamProofDraft(JSON.stringify(draft), {
    examId: "exam-1",
    language: "SPANISH",
    questionIds: ["q-es", "q-6"],
  });

  assert.deepEqual(restored?.answers, { "q-es": "C", "q-6": null });
  assert.equal(JSON.stringify(restored).includes("correctAlternative"), false);
  assert.equal(JSON.stringify(restored).includes("explanation"), false);
  assert.equal(oldExamProofStorageKey("exam-1", "SPANISH"), "estudaki:old-exam-proof:v1:exam-1:SPANISH");
});

test("rejects a draft containing a question from another booklet", () => {
  const draft = createOldExamProofDraft("exam-1", "ENGLISH", ["q-en"]);
  draft.answers["foreign-question"] = "A";

  assert.equal(
    parseOldExamProofDraft(JSON.stringify(draft), {
      examId: "exam-1",
      language: "ENGLISH",
      questionIds: ["q-en"],
    }),
    null,
  );
});

test("normalizes blanks but rejects invalid alternatives and foreign ids", () => {
  assert.deepEqual(validateOldExamProofSubmission({ q1: "B" }, ["q1", "q2"]), {
    ok: true,
    answers: { q1: "B", q2: null },
  });
  assert.equal(validateOldExamProofSubmission({ q1: "F" }, ["q1"]).ok, false);
  assert.equal(validateOldExamProofSubmission({ q1: "A", q9: "B" }, ["q1"]).ok, false);
});
