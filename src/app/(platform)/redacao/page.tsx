import { EssayWorkspace } from "@/components/essay-workspace";
import { PageHeader } from "@/components/page-header";
import { requirePersistedUser } from "@/lib/auth";
import { db } from "@/lib/db";

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asProposalBlocks(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const block = item as Record<string, unknown>;
    if (typeof block.content !== "string" || !block.content.trim()) return [];
    return [{
      type: typeof block.type === "string" ? block.type : "text",
      content: block.content,
      order: typeof block.order === "number" ? block.order : 0,
    }];
  }).sort((left, right) => left.order - right.order);
}

function asProposalAssets(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const asset = item as Record<string, unknown>;
    if (typeof asset.url !== "string" || !asset.url.trim()) return [];
    return [{
      url: asset.url,
      altText: typeof asset.altText === "string" ? asset.altText : "Elemento visual da proposta oficial",
      order: typeof asset.order === "number" ? asset.order : 0,
    }];
  }).sort((left, right) => left.order - right.order);
}

export default async function RedacaoPage() {
  const user = await requirePersistedUser();
  const [history, officialProposals] = await Promise.all([
    db.essaySubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, theme: true, score: true, createdAt: true },
    }),
    db.officialEssayProposal.findMany({
      where: { status: "PUBLISHED", reviewStatus: "APPROVED" },
      orderBy: [{ provaAntiga: { ano: "desc" } }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        theme: true,
        promptText: true,
        instructions: true,
        blocks: true,
        assets: true,
        originalPageUrl: true,
        provaAntiga: { select: { ano: true, dia: true } },
      },
    }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Redação ENEM" title="Escreva, escaneie e evolua" description="OCR para textos manuscritos e análise pedagógica pelas cinco competências da matriz oficial." />
      <EssayWorkspace
        history={history.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
        officialProposals={officialProposals.map((proposal) => ({
          id: proposal.id,
          year: proposal.provaAntiga.ano,
          day: proposal.provaAntiga.dia,
          title: proposal.title,
          theme: proposal.theme,
          promptText: proposal.promptText,
          instructions: asStringArray(proposal.instructions),
          blocks: asProposalBlocks(proposal.blocks),
          assets: asProposalAssets(proposal.assets),
          originalPageUrl: proposal.originalPageUrl,
        }))}
      />
    </div>
  );
}
