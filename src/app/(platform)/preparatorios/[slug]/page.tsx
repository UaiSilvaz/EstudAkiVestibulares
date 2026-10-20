import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { preparationOffer, preparationOwned } from "@/lib/official-offers";
import { PaymentCheckout } from "@/components/payment-checkout";
import { PageHeader } from "@/components/page-header";
export default async function PreparationProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser(); const { slug } = await params;
  const preparation = await db.preparation.findUnique({ where: { slug }, include: { courses: { include: { course: true }, orderBy: { position: "asc" } } } });
  if (!preparation || preparation.status !== "PUBLISHED") notFound();
  const [offer, purchased] = await Promise.all([preparationOffer(preparation.id), preparationOwned(user.id, preparation.id)]);
  const owned = user.role === "ADMIN" || purchased;
  return <div className="space-y-5"><PageHeader eyebrow="Preparatório oficial Norte Preparatórios" title={preparation.name} description={preparation.description} />
    <section className="rounded-3xl bg-white p-6 shadow-sm"><p className="font-bold">{owned ? "Preparatório liberado na sua conta" : offer?.canPurchase ? "Compra individual · sem assinatura obrigatória" : "Em breve"}</p>
      <p className="mt-3 text-sm text-slate-600">Criar conta, escolher este objetivo e usar o plano básico é grátis. A compra libera os cursos completos incluídos abaixo. Professores fazem parte da equipe de conteúdo Norte Preparatórios.</p>
      {offer?.product && <p className="mt-4 text-2xl font-semibold">{(offer.product.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>}
      {!owned && offer?.canPurchase && <div className="mt-5 max-w-md"><PaymentCheckout preparationId={preparation.id} label="Comprar este preparatório" /></div>}
      {!owned && !offer?.canPurchase && <p className="mt-4 text-sm text-slate-600">A compra será disponibilizada quando o preparatório estiver pronto.</p>}
    </section>
    <section className="grid gap-4 md:grid-cols-2">{preparation.courses.filter(link => link.course.published || link.course.status === "PUBLISHED").map(({ course }) => <Link key={course.id} href={`/cursos/${course.slug}`} className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-bold">{course.title}</h2><p className="mt-2 text-sm">{owned || course.isFree ? "Abrir curso" : "Ver conteúdo e aulas demonstrativas"}</p></Link>)}</section>
    <Link href="/explorar" className="inline-block font-bold text-blue-700">Voltar aos preparatórios</Link>
  </div>;
}
