import { loadEnvConfig } from "@next/env";
import { db } from "../src/lib/db";
import { regenerateStudyPlan } from "../src/lib/adaptive-study-plan";

loadEnvConfig(process.cwd());

async function main() {
  const email = process.argv[2];
  if (!email) {
    throw new Error("Uso: npm run study-plan:generate -- usuario@email.com");
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Usuário não encontrado: ${email}`);

  const result = await regenerateStudyPlan(user.id);
  console.log(
    JSON.stringify(
      {
        user: user.email,
        tasks: result.tasks.length,
        pendingErrors: result.diagnostics.pendingErrors,
        weeklyMinutes: result.diagnostics.weeklyMinutes,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
