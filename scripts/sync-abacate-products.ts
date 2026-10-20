import { PrismaClient } from "@prisma/client";
import { abacateRequest } from "../src/lib/payments/abacatepay";

const db = new PrismaClient();
type RemoteProduct = { id: string; externalId: string; price: number; currency: string; status: string; cycle?: string | null };

async function main() {
  if (!process.env.ABACATEPAY_API_KEY) throw new Error("Configure ABACATEPAY_API_KEY antes de sincronizar o catálogo.");
  const remote = await abacateRequest<RemoteProduct[]>("products/list");
  const products = await db.product.findMany({ where: { status: "PUBLISHED", priceCents: { gte: 100 } } });
  for (const product of products) {
    const externalId = `estudaki:${product.id}:${product.priceCents}`;
    let match = remote.find(item => (item.id === product.abacateProductId || item.externalId === externalId) &&
      item.price === product.priceCents && item.currency === "BRL" && item.status === "ACTIVE" && !item.cycle);
    if (!match) {
      match = await abacateRequest<RemoteProduct>("products/create", {
        externalId, name: product.name, description: product.description.slice(0, 1000), price: product.priceCents, currency: "BRL",
      });
      remote.push(match);
    }
    await db.product.update({ where: { id: product.id }, data: { abacateProductId: match.id } });
    console.log(`Oferta sincronizada: ${product.name}`);
  }
  console.log("Catálogo sincronizado. Nenhum checkout ou pagamento foi criado.");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Falha na sincronização."); process.exitCode = 1; }).finally(() => db.$disconnect());
