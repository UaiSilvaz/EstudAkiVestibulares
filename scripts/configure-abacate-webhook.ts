import { abacateRequest, abacateTestMode } from "../src/lib/payments/abacatepay";

type Webhook = { id: string; endpoint: string; events: string[]; devMode: boolean };
const events = ["checkout.completed", "checkout.refunded", "checkout.disputed", "checkout.lost"];

async function main() {
  if (abacateTestMode()) throw new Error("Configure ABACATEPAY_ENV=production para esta ferramenta.");
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) throw new Error("Configure um segredo de webhook com pelo menos 32 caracteres.");
  const endpoint = new URL("/api/webhooks/abacatepay", process.env.NEXT_PUBLIC_APP_URL);
  if (endpoint.protocol !== "https:" || endpoint.hostname !== "estudakivestibulares.com.br") {
    throw new Error("O webhook de produção deve usar o domínio próprio do EstudAki.");
  }
  endpoint.searchParams.set("webhookSecret", secret);
  const existing = await abacateRequest<Webhook[]>("webhooks/list");
  const match = existing.find(webhook => webhook.endpoint === endpoint.toString());
  if (match) {
    if (match.devMode || events.some(event => !match.events.includes(event))) throw new Error("O webhook existente precisa ter ambiente e eventos corrigidos no painel.");
    console.log("Webhook de produção já configurado com os eventos necessários.");
    return;
  }
  if (!process.argv.includes("--apply")) {
    console.log("Webhook ausente. Execute novamente com --apply para cadastrá-lo. Nenhuma alteração realizada.");
    return;
  }
  const created = await abacateRequest<Webhook>("webhooks/create", {
    name: "EstudAki — pagamentos de produção", endpoint: endpoint.toString(), secret, events,
  });
  if (created.devMode || created.endpoint !== endpoint.toString() || events.some(event => !created.events.includes(event))) {
    throw new Error("A configuração retornada pelo provedor precisa ser revisada.");
  }
  console.log("Webhook de produção cadastrado. Nenhum pagamento foi criado.");
}

main().catch(() => {
  // Provider errors and URLs must never expose webhook credentials in build logs.
  console.error("Falha ao configurar webhook: verifique chave, permissões e variáveis de produção.");
  process.exitCode = 1;
});
