import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const problems = [];
const requireValue = (name) => {
  const value = process.env[name]?.trim();
  if (!value || /PROJECT_REF|PASSWORD|\[SENSITIVE\]/.test(value)) problems.push(`${name}: configure um valor real no ambiente de produção.`);
  return value;
};
for (const name of ["DATABASE_URL", "DIRECT_URL", "SESSION_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "EMAIL_FROM"]) requireValue(name);
if (process.env.PAYMENT_PROVIDER === "abacatepay") {
  requireValue("ABACATEPAY_API_KEY"); requireValue("ABACATEPAY_WEBHOOK_SECRET");
  if (process.env.ABACATEPAY_ENV !== "production") problems.push("ABACATEPAY_ENV: configure production antes do lançamento público.");
}
if (Buffer.byteLength(process.env.SESSION_SECRET || "") < 32) problems.push("SESSION_SECRET: use pelo menos 32 bytes aleatórios.");
for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  try {
    const url = new URL(process.env[name]);
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) problems.push(`${name}: o banco local não é acessível pela hospedagem.`);
  } catch { problems.push(`${name}: URL inválida.`); }
}
try {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
  if (url.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(url.hostname)) problems.push("NEXT_PUBLIC_APP_URL: configure o domínio público com HTTPS.");
} catch { problems.push("NEXT_PUBLIC_APP_URL: configure o domínio público com HTTPS."); }
for (const name of ["ALLOW_LEGACY_SESSION_COOKIE", "ALLOW_ENEM_2025_PILOT_TEST", "LOCAL_AUTH_ENABLED"]) {
  if (process.env[name] === "true") problems.push(`${name}: desative para produção.`);
}

const db = new PrismaClient({ log: [] });
try {
  await db.$queryRaw`SELECT 1`;
  const migrations = await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL`;
  if (migrations.length) problems.push("Banco: existem migrações incompletas.");
  await db.authSession.count();
  await db.studentLearningProfile.count();
  await db.xpAward.count();
  await db.emailVerification.count();
  await db.passwordReset.count();
  const publishedCourses = await db.course.count({ where: { published: true, status: "PUBLISHED" } });
  if (!publishedCourses) problems.push("Aulas: não há cursos publicados no banco de destino.");
  const publishedQuestions = await db.question.count({ where: { status: "PUBLISHED", reviewState: "APPROVED" } });
  if (!publishedQuestions) problems.push("Questões: não há questões publicadas no banco de destino.");
  const users = await db.user.findMany({ select: { email: true, passwordHash: true } });
  for (const user of users) {
    if (user.passwordHash && await Promise.all(["123456", "prof123", "admin123", "Admin@123"].map((password) => bcrypt.compare(password, user.passwordHash))).then((matches) => matches.some(Boolean))) {
      problems.push(`Banco: a conta ${user.email} ainda usa senha de demonstração. Troque-a antes de lançar.`);
    }
  }
  const paid = await db.product.count({ where: { status: "PUBLISHED", priceCents: { gt: 0 } } });
  if (process.env.PAYMENT_PROVIDER === "hotmart") {
    if (paid && !process.env.HOTMART_HOTTOK_SECRET && !process.env.HOTMART_HOTTOK) problems.push("Pagamentos: há produtos pagos sem segredo do webhook Hotmart.");
    const incomplete = await db.product.count({ where: { status: "PUBLISHED", priceCents: { gt: 0 }, OR: [{ checkoutUrl: null }, { checkoutUrl: "" }, { hotmartProductId: null }] } });
    if (incomplete) problems.push(`Pagamentos: ${incomplete} produto(s) pago(s) sem checkout/identificador Hotmart.`);
  } else if (paid) {
    requireValue("ABACATEPAY_API_KEY"); requireValue("ABACATEPAY_WEBHOOK_SECRET");
    if (process.env.ABACATEPAY_ENV !== "production") problems.push("ABACATEPAY_ENV: configure production e uma chave de produção para o lançamento.");
    const incomplete = await db.product.count({ where: { status: "PUBLISHED", priceCents: { gt: 0 }, abacateProductId: null } });
    if (incomplete) problems.push(`Pagamentos: ${incomplete} produto(s) ainda não sincronizado(s) com a AbacatePay.`);
  }
} catch {
  problems.push("Banco: conexão ou schema indisponível. Execute prisma migrate deploy no banco de destino.");
} finally { await db.$disconnect(); }

if (problems.length) {
  console.error("Lançamento pendente:\n" + problems.map((problem) => `- ${problem}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Configuração básica de produção validada. Ainda valide buckets privados, conteúdo e os fluxos no domínio público.");
}
