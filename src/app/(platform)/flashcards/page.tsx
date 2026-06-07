import { FlashcardDeck } from "@/components/flashcard-deck";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function FlashcardsPage() {
  await requireUser();
  const cards = await db.flashcard.findMany({
    where: { status: "PUBLISHED" },
    include: { subject: true, topic: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Revisao ativa"
        title="Flashcards"
        description="Cards de memorizacao para revisar conceitos que costumam aparecer nos seus erros."
      />
      <FlashcardDeck cards={cards} />
    </div>
  );
}
