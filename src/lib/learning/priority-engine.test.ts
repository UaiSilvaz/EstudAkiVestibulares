import assert from "node:assert/strict";
import { test } from "node:test";
import type { MasteryNode } from "./mastery-engine";
import { questionPracticeHref, rankLearningPriorities } from "./priority-engine";

const now = new Date("2026-08-19T12:00:00.000Z");

function mastery(overrides: Partial<MasteryNode>): MasteryNode {
  return {
    key: "topic:base",
    level: "topic",
    subjectId: "subject-1",
    subjectName: "Matematica",
    subjectColor: "#2563EB",
    subjectSlug: "matematica",
    topicId: "topic-1",
    topicName: "Funcoes",
    questionCount: 20,
    answeredQuestions: 12,
    totalAttempts: 12,
    correctAttempts: 9,
    pendingErrors: 0,
    reviewedErrors: 0,
    averageTimeSeconds: 80,
    accuracy: 75,
    weightedAccuracy: 75,
    coverage: 60,
    recencyScore: 90,
    consistencyScore: 70,
    evidenceScore: 80,
    masteryScore: 70,
    status: "progressing",
    lastTouchedAt: now,
    ...overrides,
  };
}

test("pending errors and weak mastery outrank a healthier topic", () => {
  const priorities = rankLearningPriorities({
    now,
    daysUntilExam: 30,
    mastery: [
      mastery({
        key: "topic:strong",
        topicId: "topic-strong",
        topicName: "Equacoes",
        masteryScore: 82,
        status: "mastered",
      }),
      mastery({
        key: "topic:weak",
        topicId: "topic-weak",
        topicName: "Probabilidade",
        masteryScore: 34,
        status: "attention",
        pendingErrors: 3,
      }),
    ],
  });

  assert.equal(priorities[0]?.topicName, "Probabilidade");
  assert.ok((priorities[0]?.priorityScore ?? 0) > (priorities[1]?.priorityScore ?? 100));
  assert.match(priorities[0]?.reasons[0] ?? "", /erro/);
});

test("question href keeps real practice filters", () => {
  assert.equal(
    questionPracticeHref({
      subjectId: "subject-1",
      topicId: "topic-1",
      count: 7,
      mode: "errors",
      vestibularSlug: "enem",
    }),
    "/questions?vestibular=enem&mode=errors&session=1&count=7&subject=subject-1&topic=topic-1",
  );
});
