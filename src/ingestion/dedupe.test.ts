import assert from "node:assert/strict";
import test from "node:test";
import { findDuplicateGroups } from "./dedupe";

test("finds exact and likely duplicate question groups without deleting them", () => {
  const groups = findDuplicateGroups([
    {
      id: "q1",
      statement: "Quanto e 2 + 2?",
      alternatives: JSON.stringify([{ text: "4" }, { text: "5" }]),
      year: 2024,
      boardName: "INEP",
    },
    {
      id: "q2",
      statement: "Quanto \u00e9 2 + 2?",
      alternatives: [{ text: "4" }, { text: "5" }],
      year: 2024,
      boardName: "INEP",
    },
    {
      id: "q3",
      statement: "Quanto e 2 + 2?",
      alternatives: [{ text: "4" }, { text: "5" }],
      year: 2025,
      boardName: "FGV",
    },
  ]);

  assert.equal(
    groups.some(
      (group) =>
        group.kind === "EXACT_DUPLICATE" &&
        group.questionIds.includes("q1") &&
        group.questionIds.includes("q2"),
    ),
    true,
  );
  assert.equal(
    groups.some(
      (group) =>
        group.kind === "LIKELY_DUPLICATE" &&
        group.questionIds.includes("q3"),
    ),
    true,
  );
});
