import assert from "node:assert/strict";
import test from "node:test";
import { progressionTracks, rankForXp, rankProgressForXp, rankTrackForObjective } from "./progression";

test("every objective has a valid current rank at zero, boundaries and maximum XP", () => {
  for (const objective of [undefined, "ENEM", "OAB", "Policial", "Concurso", "Militar", "Outro objetivo"]) {
    const track = rankTrackForObjective(objective);
    for (const xp of [-1, 0, 999, 1000, 2499, 2500, 4500, 7000, 10000, 100000]) {
      const progress = rankProgressForXp(xp, objective);
      assert.ok(track.includes(progress.current));
      assert.equal(progress.current.name, rankForXp(xp, objective));
      assert.ok(progress.value >= 0 && progress.value <= 100);
      assert.ok(progress.remaining >= 0);
      if (xp >= 10000) {
        assert.equal(progress.next, null);
        assert.equal(progress.value, 100);
      }
    }
  }
  assert.equal(Object.keys(progressionTracks).length, 6);
});
