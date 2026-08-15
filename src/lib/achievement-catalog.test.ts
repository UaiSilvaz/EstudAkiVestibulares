import assert from "node:assert/strict";
import test from "node:test";
import {
  achievementCatalog,
  achievementCategoryCounts,
  achievementCategorySummary,
} from "@/lib/achievement-catalog";

const validRarities = new Set(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC", "SECRET"]);
const bannedTexts = [
  /conquista \d+/i,
  /placeholder/i,
  /\bTODO\b/i,
  /adicionar depois/i,
  /em breve/i,
  /icone generico/i,
];

function duplicated(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return Array.from(duplicates);
}

test("catalogo possui exatamente 500 conquistas completas e unicas", () => {
  assert.equal(achievementCatalog.length, 500);
  assert.deepEqual(duplicated(achievementCatalog.map((item) => item.slug)), []);
  assert.deepEqual(duplicated(achievementCatalog.map((item) => item.name)), []);
  assert.deepEqual(duplicated(achievementCatalog.map((item) => item.iconKey)), []);

  for (const achievement of achievementCatalog) {
    assert.ok(achievement.description.trim(), achievement.slug);
    assert.ok(achievement.lockedDescription.trim(), achievement.slug);
    assert.ok(achievement.iconDescription.trim(), achievement.slug);
    assert.ok(validRarities.has(achievement.rarity), achievement.slug);
    assert.ok(achievement.xpReward > 0, achievement.slug);
    assert.ok(achievement.coinReward >= 0, achievement.slug);
    assert.ok(achievement.target >= 0, achievement.slug);
    assert.equal(typeof achievement.requirement, "object", achievement.slug);
    assert.equal(achievement.isRepeatable, false, achievement.slug);
    assert.ok(!bannedTexts.some((pattern) => pattern.test(achievement.name)), achievement.name);
    assert.ok(!bannedTexts.some((pattern) => pattern.test(achievement.description)), achievement.slug);
  }
});

test("categorias batem com a distribuicao obrigatoria", () => {
  const summary = achievementCategorySummary();
  assert.deepEqual(summary, achievementCategoryCounts);
  assert.equal(Object.values(summary).reduce((sum, count) => sum + count, 0), 500);
});

test("as 12 disciplinas possuem exatamente 13 conquistas", () => {
  const subjectCounts = new Map<string, number>();
  for (const achievement of achievementCatalog.filter((item) => item.category === "SUBJECT")) {
    assert.ok(achievement.subjectId, achievement.slug);
    subjectCounts.set(achievement.subjectId, (subjectCounts.get(achievement.subjectId) ?? 0) + 1);
  }

  assert.equal(subjectCounts.size, 12);
  for (const [subject, count] of subjectCounts) {
    assert.equal(count, 13, subject);
  }
});

test("conquistas secretas ficam ocultas antes do desbloqueio", () => {
  const secrets = achievementCatalog.filter((item) => item.category === "SECRET");
  assert.equal(secrets.length, 19);
  for (const achievement of secrets) {
    assert.equal(achievement.rarity, "SECRET");
    assert.equal(achievement.isHidden, true);
    assert.match(achievement.lockedDescription, /secreta|silhueta/i);
  }
});
