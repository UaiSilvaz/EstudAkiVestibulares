import assert from "node:assert/strict";
import test from "node:test";
import { buildPublishedQuestionWhere, parseQuestionFilters } from "./question-filters";

test("normaliza dia, area e alias de conteudo sem perder filtros existentes", () => {
  const filters = parseQuestionFilters({
    vestibular: "enem",
    subject: "subject-1",
    content: "topic-1",
    year: "2022",
    day: "1º dia",
    area: "LC",
    difficulty: "HARD",
    q: "cultura",
  });

  assert.deepEqual(filters, {
    vestibular: "enem",
    subject: "subject-1",
    topic: "topic-1",
    year: 2022,
    day: "1º dia",
    area: "Linguagens, Códigos e suas Tecnologias",
    difficulty: "HARD",
    mode: undefined,
    scope: undefined,
    query: "cultura",
  });
});

test("monta filtro publicado por dia e metadado pedagogico sem campos de gabarito", () => {
  const where = buildPublishedQuestionWhere(
    parseQuestionFilters({ day: "dia-2", area: "CH", topic: "topic-2" }),
    "enem-id",
  );

  assert.deepEqual(where, {
    AND: [
      { status: "PUBLISHED" },
      { reviewState: "APPROVED" },
      { vestibularId: "enem-id" },
      { topicId: "topic-2" },
      { day: "2º dia" },
      {
        pedagogicalMetadata: {
          is: { knowledgeArea: "Ciências Humanas e suas Tecnologias" },
        },
      },
    ],
  });
  assert.equal(JSON.stringify(where).includes("correctAlternative"), false);
});

test("mantem filtros acumulados e aceita Quimica quando ENEM usa Natureza ampla", () => {
  const where = buildPublishedQuestionWhere(
    parseQuestionFilters({ subject: "subject-quimica", year: "2025", difficulty: "MEDIUM" }),
    "enem-id",
    { id: "subject-quimica", name: "Química", slug: "quimica" },
  );
  const serialized = JSON.stringify(where);

  assert.equal(serialized.includes("subject-quimica"), true);
  assert.equal(serialized.includes("natureza"), true);
  assert.equal(serialized.includes("2025"), true);
  assert.equal(serialized.includes("MEDIUM"), true);
});

test("ignora ano e dificuldade invalidos", () => {
  const filters = parseQuestionFilters({ year: "zero", difficulty: "IMPOSSIBLE" });
  assert.equal(filters.year, undefined);
  assert.equal(filters.difficulty, undefined);
});
