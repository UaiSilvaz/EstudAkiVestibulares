import { Role } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { EnemQuestionReviewWorkspace } from "@/components/admin/enem-question-review-workspace";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  findPilotJob,
  findPilotQuestion,
  serializePilotQuestion,
} from "@/lib/enem-import-admin";

export const dynamic = "force-dynamic";

export default async function EnemQuestionReviewPage({
  params,
}: {
  params: Promise<{ jobId: string; numero: string }>;
}) {
  const user = await requireManager();
  if (user.role !== Role.ADMIN) redirect("/admin");
  const { jobId, numero } = await params;
  const questionNumber = Number(numero);
  const job = await findPilotJob(jobId);
  if (!job) notFound();
  const record = await findPilotQuestion(job, questionNumber);
  if (!record) notFound();
  const [subjects, topics] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.topic.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, subjectId: true } }),
  ]);

  return (
    <EnemQuestionReviewWorkspace
      initialData={serializePilotQuestion(job, record)}
      subjects={subjects}
      topics={topics}
    />
  );
}
