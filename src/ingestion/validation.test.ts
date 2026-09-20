import assert from "node:assert/strict";
import test from "node:test";
import { validateQuestionManifest } from "./validation";
import type { CanonicalQuestionManifest } from "./types";

const hash = "a".repeat(64);

function baseQuestion(
  overrides: Partial<CanonicalQuestionManifest> = {},
): CanonicalQuestionManifest {
  return {
    id: "q1",
    externalId: "INEP-ENEM-2024-D2-091",
    fingerprint: hash,
    statementHtml: "<p>Texto estruturado.</p>",
    statementPlainText: "Texto estruturado.",
    contentBlocks: [{ type: "command", content: "Texto estruturado.", order: 0 }],
    alternatives: ["A", "B", "C", "D", "E"].map((letter, order) => ({
      letter,
      order,
      contentHtml: `<p>${letter}</p>`,
      contentPlainText: letter,
      contentBlocks: [{ type: "paragraph", content: letter, order: 0 }],
      assets: [],
    })),
    officialAnswer: "A",
    answerStatus: "FINAL",
    questionNumber: 91,
    type: "MULTIPLE_CHOICE",
    year: 2024,
    examName: "ENEM 2024",
    boardName: "INEP",
    institutionName: "ENEM",
    topics: [],
    confidence: {
      text: 1,
      alternatives: 1,
      images: 1,
      answer: 1,
      classification: 1,
      overall: 1,
    },
    reviewStatus: "AUTO_APPROVED",
    publicationBlockers: [],
    source: {
      provider: "inep",
      sourceUrl: "https://example.test/original",
      documentUrl: "https://example.test/prova.pdf",
      documentName: "prova.pdf",
      documentHash: hash,
    },
    assets: [],
    ...overrides,
  };
}

test("blocks student-facing facsimile assets", () => {
  const issues = validateQuestionManifest(
    baseQuestion({
      assets: [
        {
          id: "asset-1",
          type: "PROMPT_FACSIMILE",
          relation: "STATEMENT",
          originalFile: "question-print.png",
          width: 1000,
          height: 1400,
          mimeType: "image/png",
          sha256: hash,
          altText: "facsimile",
        },
      ],
    }),
  );

  assert.equal(
    issues.some((issue) => issue.code === "student_facing_facsimile"),
    true,
  );
});

test("accepts admin-only original references", () => {
  const issues = validateQuestionManifest(
    baseQuestion({
      assets: [
        {
          id: "asset-1",
          type: "ORIGINAL_REFERENCE",
          relation: "ADMIN_REFERENCE",
          originalFile: "official-crop.png",
          width: 1000,
          height: 1400,
          mimeType: "image/png",
          sha256: hash,
          altText: "official reference",
        },
      ],
    }),
  );

  assert.equal(issues.some((issue) => issue.severity === "error"), false);
});
