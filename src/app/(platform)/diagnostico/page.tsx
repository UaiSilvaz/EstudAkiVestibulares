import { InitialDiagnostic } from "@/components/initial-diagnostic";
import { studyIconNameForSubject, type StudyIconName } from "@/components/visual/study-icon";
import { requirePersistedUser } from "@/lib/auth";
import { db } from "@/lib/db";

const areaLabels: Record<StudyIconName, string> = {
  matematica: "Matematica",
  linguagens: "Linguagens",
  redacao: "Redacao",
  fisica: "Fisica",
  quimica: "Quimica",
  biologia: "Biologia",
  geografia: "Geografia",
  "ciencias-humanas": "Ciencias Humanas",
};

const baseAreas: StudyIconName[] = [
  "matematica",
  "linguagens",
  "fisica",
  "quimica",
  "biologia",
  "ciencias-humanas",
  "redacao",
];

export default async function DiagnosticoPage() {
  const user = await requirePersistedUser();
  const attempts = await db.questionAttempt
    .findMany({
      where: { userId: user.id, annulled: false },
      select: {
        correct: true,
        question: {
          select: {
            subject: { select: { name: true } },
          },
        },
      },
      take: 240,
      orderBy: { createdAt: "desc" },
    })
    .catch(() => []);

  const stats = new Map<StudyIconName, { attempts: number; correct: number }>();
  for (const attempt of attempts) {
    const key = studyIconNameForSubject(attempt.question.subject.name);
    const current = stats.get(key) ?? { attempts: 0, correct: 0 };
    current.attempts += 1;
    current.correct += attempt.correct ? 1 : 0;
    stats.set(key, current);
  }

  const pendingErrors = attempts.filter((attempt) => !attempt.correct).length;
  const areas = baseAreas.map((key) => {
    const area = stats.get(key);
    return {
      key,
      label: areaLabels[key],
      attempts: area?.attempts ?? 0,
      initialScore: area && area.attempts >= 3 ? Math.round((area.correct / area.attempts) * 100) : null,
    };
  });

  return <InitialDiagnostic areas={areas} pendingErrors={pendingErrors} />;
}
