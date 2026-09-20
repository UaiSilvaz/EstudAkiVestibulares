import assert from "node:assert/strict";
import test from "node:test";
import { createStudentQuestionPayload } from "./student-question-payload";

test("o payload inicial mantém a questão respondível sem revelar o gabarito", () => {
  const source = {
    id: "question-1",
    supportText: "Texto de apoio",
    statement: "Comando completo",
    year: 2022,
    exam: "ENEM 2022",
    difficulty: "MEDIUM",
    subjectId: "subject-1",
    vestibularId: "enem-id",
    topicId: "topic-1",
    videoUrl: null,
    imageUrl: null,
    images: JSON.stringify([{ url: "/imagem.png", altText: "Gráfico oficial" }]),
    source: "Inep",
    sourceName: "Inep",
    sourceUrl: "https://example.test/prova.pdf",
    sourceCitation: "ENEM 2022, questão 91",
    sourceAccessedAt: "2026-07-18",
    sourceType: "OFFICIAL",
    questionNumber: 91,
    day: "2º dia",
    officialLanguage: "NOT_APPLICABLE",
    officialGroup: "enem-2022-dia-2",
    officialVariant: "AMARELO",
    answerSituation: "CONFIRMED",
    alternatives: JSON.stringify([
      { key: "A", text: "Alternativa A", correct: true, explanation: "segredo" },
      { key: "B", text: "Alternativa B", correct: false },
      { key: "C", text: "Alternativa C", correct: false },
      { key: "D", text: "Alternativa D", correct: false },
      { key: "E", text: "Alternativa E", correct: false },
    ]),
    subject: { id: "subject-1", name: "Matemática" },
    topic: { id: "topic-1", name: "Geometria", subjectId: "subject-1" },
    vestibular: { id: "enem-id", name: "ENEM", color: "#2563eb" },
    pedagogicalMetadata: { knowledgeArea: "Matemática e suas Tecnologias" },
    blocks: [
      {
        id: "block-1",
        type: "SUPPORT_TEXT",
        content: "Observe a figura.",
        order: 0,
        confidence: 0.98,
        asset: null,
      },
      {
        id: "block-2",
        type: "IMAGE",
        content: "Grafico oficial",
        order: 1,
        confidence: 0.96,
        asset: {
          url: "/api/questions/assets/q1/figure-01.webp",
          altText: "Grafico oficial limpo",
          description: "Recorte administrativo nao usado no aluno",
          width: 640,
          height: 320,
          assetType: "VISUAL",
          relation: "STATEMENT",
        },
      },
    ],
    correctAlternative: "A",
    explanation: "resolução secreta",
    alternativeExplanations: "{}",
  };

  const payload = createStudentQuestionPayload(source);
  const serialized = JSON.stringify(payload);

  assert.equal(payload.alternatives.length, 5);
  assert.equal(payload.blocks.length, 2);
  assert.deepEqual(payload.blocks[1]?.asset, {
    url: "/api/questions/assets/q1/figure-01.webp",
    altText: "Grafico oficial limpo",
    width: 640,
    height: 320,
    assetType: "VISUAL",
    relation: "STATEMENT",
  });
  assert.deepEqual(payload.alternatives[0], {
    key: "A",
    text: "Alternativa A",
    imageUrl: null,
  });
  assert.equal(serialized.includes("correctAlternative"), false);
  assert.equal(serialized.includes("resolução secreta"), false);
  assert.equal(serialized.includes("segredo"), false);
  assert.equal(serialized.includes('"correct"'), false);
});
