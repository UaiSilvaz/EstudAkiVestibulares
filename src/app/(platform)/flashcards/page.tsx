import { FlashcardDeck } from "@/components/flashcard-deck";
import { PageHeader } from "@/components/page-header";
import { requirePersistedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureAnkiFlashcards } from "@/lib/flashcards-bootstrap";

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePersistedUser();
  const params = await searchParams;
  const initialSubject = typeof params.subject === "string" ? params.subject : "";

  await ensureAnkiFlashcards();

  const [subjects, deckRows] = await Promise.all([
    db.subject.findMany({
      where: { flashcards: { some: { status: "PUBLISHED" } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.flashcard.findMany({
      where: { status: "PUBLISHED", deck: { not: null } },
      distinct: ["subjectId", "deck"],
      select: { subjectId: true, deck: true },
      orderBy: { deck: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revisão ativa"
        title="Flashcards por matéria"
        description="Flashcards reais do acervo ENEM e Pré-Med, favoritos e baralhos criados pela comunidade."
      />
      <FlashcardDeck
        subjects={subjects}
        decks={deckRows
          .filter((item): item is { subjectId: string | null; deck: string } => Boolean(item.deck))
          .map((item) => ({ subjectId: item.subjectId, name: item.deck }))}
        currentUserId={user.id}
        initialSubject={initialSubject}
      />
    </div>
  );
}
