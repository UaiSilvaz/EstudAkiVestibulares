import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Compass, LockKeyhole, Sparkles, Target } from "lucide-react";
import { ContentStatus } from "@prisma/client";
import { FastLink } from "@/components/fast-link";
import { PageHeader } from "@/components/page-header";
import { getPersistedUserId, requirePersistedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ensureEducationCatalog,
  getFallbackPreparationCatalog,
  upsertUserPreparation,
} from "@/lib/preparations";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { cn } from "@/lib/utils";

async function getExploreCatalog(persistedUserId: string | null) {
  try {
    await ensureEducationCatalog();

    const [preparations, memberships] = await Promise.all([
      db.preparation.findMany({
        where: { status: ContentStatus.PUBLISHED },
        include: { vertical: true },
        orderBy: [{ isFree: "desc" }, { name: "asc" }],
      }),
      persistedUserId
        ? db.userPreparation.findMany({
            where: { userId: persistedUserId, status: "ACTIVE" },
            select: { preparationId: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      catalogAvailable: true,
      preparations,
      membershipIds: new Set(memberships.map((membership) => membership.preparationId)),
    };
  } catch (error) {
    console.warn("Catalogo de preparacoes indisponivel em /explorar; usando fallback.", error);
    return {
      catalogAvailable: false,
      preparations: getFallbackPreparationCatalog(),
      membershipIds: new Set<string>(),
    };
  }
}

async function selectPreparation(formData: FormData) {
  "use server";

  const user = await requirePersistedUser();
  const userId = await getPersistedUserId(user);
  const preparationId = String(formData.get("preparationId") ?? "");

  if (!userId) redirect("/onboarding");
  if (!preparationId) redirect("/explorar");

  const preparation = await db.preparation.findFirst({
    where: { id: preparationId, status: ContentStatus.PUBLISHED },
    select: { id: true, name: true },
  });

  if (!preparation) redirect("/explorar");

  await upsertUserPreparation({
    userId,
    preparationId: preparation.id,
    displayName: preparation.name,
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export default async function ExplorarPage() {
  const { persistedUserId, activePreparation } = await getPlatformPageContext();
  const { catalogAvailable, preparations, membershipIds } = await getExploreCatalog(persistedUserId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Explorar"
        title="Escolha sua preparacao"
        description="Adicione outro objetivo, troque a preparacao ativa ou volte para o seu plano atual."
        action={
          <FastLink
            href="/preparacao"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5"
          >
            <Target className="h-4 w-4" />
            Ver ativa
          </FastLink>
        }
      />

      {!catalogAvailable ? (
        <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-900 shadow-sm">
          O catalogo online de preparacoes nao respondeu agora. Voce ainda pode escolher um objetivo
          inicial pelo onboarding enquanto sincronizamos os dados.
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {preparations.map((preparation) => {
          const isActive = preparation.id === activePreparation?.id;
          const isMember = membershipIds.has(preparation.id);
          return (
            <article
              key={preparation.id}
              className={cn(
                "rounded-[28px] border bg-white p-5 shadow-[0_20px_48px_-34px_rgba(15,23,42,0.28)]",
                isActive ? "border-blue-200 ring-2 ring-blue-100" : "border-slate-100",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase text-blue-700">
                  <Compass className="h-3.5 w-3.5" />
                  {preparation.vertical.name}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase",
                    preparation.isFree
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {preparation.isFree ? <Sparkles className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                  {preparation.isFree ? "Livre" : "Premium"}
                </span>
                {isActive && (
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase text-orange-700">
                    Ativa agora
                  </span>
                )}
              </div>

              <h2 className="mt-4 font-display text-2xl font-black text-slate-950">{preparation.name}</h2>
              <p className="mt-2 min-h-[52px] text-sm font-semibold leading-6 text-slate-600">
                {preparation.description || "Preparacao organizada com plano, questoes e revisoes."}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {catalogAvailable ? (
                  <form action={selectPreparation}>
                    <input type="hidden" name="preparationId" value={preparation.id} />
                    <button
                      type="submit"
                      className={cn(
                        "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5",
                        isActive
                          ? "bg-emerald-600 shadow-emerald-100"
                          : "bg-blue-600 shadow-blue-100",
                      )}
                    >
                      {isActive ? "Continuar" : isMember ? "Tornar ativa" : "Comecar"}
                    </button>
                  </form>
                ) : (
                  <FastLink
                    href="/onboarding"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5"
                  >
                    Configurar objetivo
                  </FastLink>
                )}
                <FastLink
                  href="/edital"
                  className="inline-flex h-11 items-center rounded-full border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  Ver edital
                </FastLink>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
