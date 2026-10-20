import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readEnemInventory, toDiscoveredExam } from "./enem-inventory";

const fixture = fileURLToPath(new URL("./fixtures/enem-inventory.md", import.meta.url));

test("parses an ENEM inventory fixture independently of local datasets", async () => {
  const entries = await readEnemInventory(fixture);

  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.year, 2009);
  assert.equal(entries.at(-1)?.year, 2024);
  assert.equal(entries.every((entry) => entry.exam.kind === "exam"), true);
  assert.equal(
    entries.every((entry) => entry.answerKey.kind === "answer_key"),
    true,
  );
  assert.equal(
    entries.every((entry) => entry.exam.url.startsWith("https://download.inep.gov.br/")),
    true,
  );
});

test("maps ENEM inventory entries to discovered exams", async () => {
  const entry = (await readEnemInventory(fixture)).find(
    (item) => item.year === 2024 && item.day === 2,
  );

  assert.ok(entry);
  const discovered = toDiscoveredExam(entry);

  assert.equal(discovered.provider, "inep");
  assert.equal(discovered.boardName, "INEP");
  assert.equal(discovered.institutionName, "ENEM");
  assert.equal(discovered.expectedQuestionCount, 90);
  assert.equal(discovered.documents.length, 2);
});
