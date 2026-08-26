import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMasteryMap, type LearningAttemptSignal, type LearningQuestionSignal } from "./mastery-engine";

const subject = { id: "subject-math", name: "Matematica", color: "#2563EB", slug: "matematica" };
const topic = { id: "topic-probability", name: "Probabilidade" };
const now = new Date("2026-08-19T12:00:00.000Z");

function daysAgo(days: number) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

const questions: LearningQuestionSignal[] = Array.from({ length: 10 }, (_, index) => ({
  id: `question-${index + 1}`,
  difficulty: index > 6 ? "HARD" : "MEDIUM",
  subject,
  topic,
}));

test("mastery uses recency, coverage and review signals beyond raw accuracy", () => {
  const attempts: LearningAttemptSignal[] = [
    {
      questionId: "question-1",
      correct: true,
      reviewed: false,
      createdAt: daysAgo(55),
      difficulty: "MEDIUM",
      subject,
      topic,
    },
    {
      questionId: "question-2",
      correct: true,
      reviewed: false,
      createdAt: daysAgo(54),
      difficulty: "MEDIUM",
      subject,
      topic,
    },
  ];

  const [node] = buildMasteryMap({ attempts, questions, now });

  assert.equal(node?.accuracy, 100);
  assert.equal(node?.coverage, 20);
  assert.equal(node?.status, "attention");
  assert.ok((node?.masteryScore ?? 100) < 78);
});

test("annulled attempts do not reduce mastery", () => {
  const [node] = buildMasteryMap({
    questions: questions.slice(0, 2),
    attempts: [
      {
        questionId: "question-1",
        correct: true,
        reviewed: false,
        createdAt: now,
        difficulty: "MEDIUM",
        subject,
        topic,
      },
      {
        questionId: "question-2",
        correct: false,
        annulled: true,
        reviewed: false,
        createdAt: now,
        difficulty: "HARD",
        subject,
        topic,
      },
    ],
    now,
  });

  assert.equal(node?.totalAttempts, 1);
  assert.equal(node?.correctAttempts, 1);
  assert.equal(node?.pendingErrors, 0);
});
