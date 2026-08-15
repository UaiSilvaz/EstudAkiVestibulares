import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDashboardInsights, calculateAccuracyRate, ERROR_NOTEBOOK_HREF } from "./insights";

const question = {
  id: "question-1",
  difficulty: "MEDIUM",
  explanation: "Explicação",
  subject: { id: "subject-1", name: "Matemática", color: "#2563EB" },
  topic: { id: "topic-1", name: "Álgebra" },
};

test("annulled attempts do not enter accuracy or dashboard performance", () => {
  const createdAt = new Date();
  const insights = buildDashboardInsights({
    profile: { name: "Estudante", weeklyHours: 8, targetExam: "ENEM" },
    questions: [question],
    attempts: [
      {
        correct: true,
        annulled: false,
        errorType: null,
        reviewed: false,
        createdAt,
        timeSpentSeconds: 30,
        question,
      },
      {
        correct: false,
        annulled: true,
        errorType: null,
        reviewed: false,
        createdAt,
        timeSpentSeconds: 900,
        question,
      },
    ],
  });

  assert.equal(insights.accuracyRate, 100);
  assert.equal(insights.weightedAccuracyRate, 100);
  assert.equal(insights.pendingErrors, 0);
  assert.equal(insights.completedToday, 1);
  assert.equal(insights.averageTimeSeconds, 30);
  assert.equal(insights.subjectPerformance[0]?.total, 1);
  assert.equal(
    insights.dailyBuckets.reduce((total, bucket) => total + bucket.attempts, 0),
    1,
  );
});

test("accuracy helper ignores annulled attempts", () => {
  assert.equal(
    calculateAccuracyRate([
      { correct: true },
      { correct: false, annulled: true },
    ]),
    100,
  );
  assert.equal(calculateAccuracyRate([{ correct: false, annulled: true }]), 0);
});

test("dashboard recommendations open focused practice and the real error notebook", () => {
  const createdAt = new Date();
  const insights = buildDashboardInsights({
    profile: { name: "Estudante", weeklyHours: 8, targetExam: "ENEM" },
    questions: [question],
    attempts: [
      {
        correct: false,
        annulled: false,
        errorType: "concept_gap",
        reviewed: false,
        createdAt,
        timeSpentSeconds: 45,
        question,
      },
    ],
  });

  assert.equal(
    insights.recommendations[0]?.actionTarget,
    "/questions?vestibular=enem&session=1&count=1&subject=subject-1&topic=topic-1",
  );
  assert.equal(insights.recommendations[1]?.actionTarget, ERROR_NOTEBOOK_HREF);
});
