import assert from "node:assert/strict";
import test from "node:test";
import { defaultLearningProfile, parseLearningProfile } from "./learning-profile";

test("validates structured profile and preserves optional goals and learning preferences", () => {
  const input = { ...defaultLearningProfile(), course: "Medicina", targetScore: "800", examDate: "2027-11-07", learningPreferences: ["video", "reading"], difficultSubjects: ["matematica"], level: "INTERMEDIATE" };
  assert.deepEqual(parseLearningProfile(input, true), input);
});
test("drafts may be incomplete but completion requires actual choices", () => {
  assert.doesNotThrow(() => parseLearningProfile(defaultLearningProfile()));
  assert.throws(() => parseLearningProfile(defaultLearningProfile(), true));
  assert.throws(() => parseLearningProfile({ ...defaultLearningProfile(), course: "Medicina", studyDays: [] }, true));
});
test("rejects impossible dates, foreign exam choices and invalid time", () => {
  for (const patch of [{ examDate: "2027-02-30" }, { exams: ["OAB"] }, { minutesPerDay: Infinity }, { studyDays: [7] }, { learningPreferences: ["fake"] }]) assert.throws(() => parseLearningProfile({ ...defaultLearningProfile(), ...patch }));
});
