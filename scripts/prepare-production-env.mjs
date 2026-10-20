import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const file = ".env.production.local";
if (existsSync(file)) {
  console.log(`${file} já existe; nenhum valor foi alterado.`);
} else {
  writeFileSync(file, [
    "# Configuração privada de produção. Nunca envie este arquivo ao Git ou pelo chat.",
    'DATABASE_URL=""', 'DIRECT_URL=""', 'SUPABASE_URL=""', 'SUPABASE_SERVICE_ROLE_KEY=""',
    `SESSION_SECRET="${randomBytes(48).toString("hex")}"`, 'NEXT_PUBLIC_APP_URL=""',
    'RESEND_API_KEY=""', 'EMAIL_FROM=""', 'PAYMENT_PROVIDER="abacatepay"',
    'ABACATEPAY_API_KEY=""', 'ABACATEPAY_ENV="production"',
    `ABACATEPAY_WEBHOOK_SECRET="${randomBytes(32).toString("hex")}"`,
    'COURSE_MEDIA_BUCKET="course-media"', 'COURSE_MEDIA_PREFIX="course-media"',
    'AVATAR_IMAGES_BUCKET="question-images"', 'LOCAL_AUTH_ENABLED="false"',
    'ALLOW_LEGACY_SESSION_COOKIE="false"', 'ALLOW_ENEM_2025_PILOT_TEST="false"', "",
  ].join("\n"), { flag: "wx" });
  console.log(`${file} criado com segredos de sessão e webhook. Preencha os valores vazios usando os painéis dos serviços.`);
}
