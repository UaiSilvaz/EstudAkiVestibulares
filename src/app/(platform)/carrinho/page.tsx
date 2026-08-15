import { PageHeader } from "@/components/page-header";
import { CartWorkspace } from "@/components/cart-workspace";
import { requirePersistedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function CarrinhoPage() {
  const user = await requirePersistedUser();
  const items = await db.cartItem.findMany({
    where: { userId: user.id },
    include: {
      product: { include: { material: { include: { subject: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Carrinho" title="Materiais para sua jornada" description="Organize compras, itens em espera e sua lista de desejos." />
      <CartWorkspace initialItems={items} />
    </div>
  );
}
