import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

const db = new PrismaClient();

const replacements: Array<[RegExp, string]> = [
  [/\bNao\b/g, "Não"],
  [/\bnao\b/g, "não"],
  [/\bQuestao\b/g, "Questão"],
  [/\bquestao\b/g, "questão"],
  [/\bQuestoes\b/g, "Questões"],
  [/\bquestoes\b/g, "questões"],
  [/\bresolucao\b/g, "resolução"],
  [/\bexplicacao\b/g, "explicação"],
  [/\brevisao\b/g, "revisão"],
  [/\bpedagogica\b/g, "pedagógica"],
  [/\bpedagogico\b/g, "pedagógico"],
  [/\bcalculos\b/g, "cálculos"],
  [/\bconteudo\b/g, "conteúdo"],
  [/\bmateria\b/g, "matéria"],
  [/\bEsta e\b/g, "Esta é"],
  [/\besta e\b/g, "esta é"],
  [/\be a resposta registrada\b/g, "é a resposta registrada"],
  [/\bde ENEM\b/g, "do ENEM"],
];

function normalizeText(value: string | null) {
  if (!value) return value;
  return replacements.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value,
  );
}

function normalizeAlternativeExplanations(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(parsed).map(([key, text]) => [key, normalizeText(text) ?? ""]),
      ),
    );
  } catch {
    return normalizeText(value) ?? "{}";
  }
}

function officialEnemReviewText(question: {
  year: number;
  alternatives: string;
  correctAlternative: string;
  explanation: string;
  sourceType: string;
  sourceName: string | null;
}) {
  const isGenericOfficialEnem =
    question.sourceType === "OFFICIAL" &&
    question.sourceName?.startsWith("INEP/") &&
    /Gabarito oficial (?:de|do) ENEM/i.test(question.explanation);
  if (!isGenericOfficialEnem) return null;

  try {
    const alternatives = JSON.parse(question.alternatives) as Array<{
      key: string;
      text: string;
    }>;
    const correct = alternatives.find(
      (item) => item.key === question.correctAlternative,
    );
    const answerText = correct?.text?.trim();
    const answerReference = answerText
      ? ` (${answerText})`
      : "";

    return {
      explanation:
        `Gabarito oficial do ENEM ${question.year}: alternativa ${question.correctAlternative}. ` +
        `A alternativa ${question.correctAlternative}${answerReference} corresponde à resposta oficial. ` +
        "Para revisar, retome o comando do enunciado, identifique os dados relevantes e compare cada opção com o que foi solicitado.",
      alternativeExplanations: JSON.stringify(
        Object.fromEntries(
          alternatives.map((item) => [
            item.key,
            item.key === question.correctAlternative
              ? `Correta conforme o gabarito oficial do ENEM ${question.year}.`
              : `Incorreta conforme o gabarito oficial do ENEM ${question.year}. Compare esta opção com o comando e com a alternativa ${question.correctAlternative}.`,
          ]),
        ),
      ),
      pedagogyComment:
        "Questão oficial do ENEM. Na revisão, destaque as informações do enunciado que eliminam cada alternativa incorreta.",
    };
  } catch {
    return null;
  }
}

async function main() {
  const subjectNames = new Map([
    ["historia", "História"],
  ]);
  const topicNames = new Map([
    ["filosofia-etica-e-conhecimento", "Ética e conhecimento"],
    ["geografia-geografia-humana-e-fisica", "Geografia humana e física"],
    ["historia-historia-geral-e-do-brasil", "História geral e do Brasil"],
    ["literatura-leitura-literaria", "Leitura literária"],
  ]);
  const catalogUpdates = [
    ...Array.from(subjectNames, ([slug, name]) =>
      db.subject.updateMany({ where: { slug }, data: { name } }),
    ),
    ...Array.from(topicNames, ([slug, name]) =>
      db.topic.updateMany({ where: { slug }, data: { name } }),
    ),
  ];
  await db.$transaction(catalogUpdates);

  const questions = await db.question.findMany({
    select: {
      id: true,
      explanation: true,
      alternativeExplanations: true,
      pedagogyComment: true,
      reviewNotes: true,
      year: true,
      alternatives: true,
      correctAlternative: true,
      sourceType: true,
      sourceName: true,
    },
  });

  const updates = questions.flatMap((question) => {
    const officialReview = officialEnemReviewText(question);
    const data = {
      explanation:
        officialReview?.explanation ?? normalizeText(question.explanation) ?? "",
      alternativeExplanations:
        officialReview?.alternativeExplanations ??
        normalizeAlternativeExplanations(question.alternativeExplanations),
      pedagogyComment:
        officialReview?.pedagogyComment ?? normalizeText(question.pedagogyComment),
      reviewNotes: normalizeText(question.reviewNotes),
    };

    const changed =
      data.explanation !== question.explanation ||
      data.alternativeExplanations !== question.alternativeExplanations ||
      data.pedagogyComment !== question.pedagogyComment ||
      data.reviewNotes !== question.reviewNotes;

    return changed
      ? [
          db.question.update({
            where: { id: question.id },
            data,
          }),
        ]
      : [];
  });

  for (let index = 0; index < updates.length; index += 250) {
    await db.$transaction(updates.slice(index, index + 250));
  }

  const activities = await db.activity.findMany({
    select: { id: true, message: true },
  });
  const activityUpdates = activities.flatMap((activity) => {
    const message = normalizeText(activity.message);
    return message && message !== activity.message
      ? [db.activity.update({ where: { id: activity.id }, data: { message } })]
      : [];
  });
  if (activityUpdates.length) await db.$transaction(activityUpdates);

  console.log(
    JSON.stringify(
      {
        scanned: questions.length,
        normalized: updates.length,
        normalizedActivities: activityUpdates.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
