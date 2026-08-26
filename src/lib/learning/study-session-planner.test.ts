import assert from "node:assert/strict";
import { test } from "node:test";
import type { LearningPriority } from "./priority-engine";
import { buildStudyNowSession, normalizeAvailableMinutes } from "./study-session-planner";

const priority: LearningPriority = {
  key: "topic-probability",
  level: "topic",
  subjectId: "subject-math",
  subjectName: "Matematica",
  subjectColor: "#2563EB",
  subjectSlug: "matematica",
  topicId: "topic-probability",
  topicName: "Probabilidade",
  masteryScore: 34,
  masteryStatus: "attention",
  masteryStatusLabel: "Precisa de atencao",
  priorityScore: 86,
  pendingErrors: 2,
  reviewedErrors: 1,
  questionCount: 20,
  answeredQuestions: 6,
  lastTouchedAt: "2026-08-01T12:00:00.000Z",
  reasons: ["2 erro(s) pendente(s) de revisao.", "Dominio pedagogico estimado em 34%."],
};

test("study-now session fits the selected available time", () => {
  const session = buildStudyNowSession({
    availableMinutes: 30,
    priorities: [priority],
    now: new Date("2026-08-19T12:00:00.000Z"),
  });

  assert.equal(session.totalMinutes, 30);
  assert.equal(session.blocks[0]?.type, "REVIEW");
  assert.equal(session.blocks.some((block) => block.type === "QUESTIONS"), true);
  assert.equal(session.startHref, session.blocks[0]?.href);
});

test("available time snaps to supported quick modes", () => {
  assert.equal(normalizeAvailableMinutes(42, 8), 30);
  assert.equal(normalizeAvailableMinutes(105, 8), 120);
  assert.equal(normalizeAvailableMinutes("default", 12), 60);
});
