import { db } from "../src/lib/db";
import { reconcileStudyXp, syncStudyStreak } from "../src/lib/study-xp";
import { writeFile, mkdir } from "node:fs/promises";

async function main() {
  if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Este script está limitado ao banco local.");
  const users = await db.user.findMany({ select: { id: true, xp: true, streak: true, league: true } });
  await mkdir(".codex", { recursive: true });
  await writeFile(".codex/progress-before-reconciliation-" + Date.now() + ".json", JSON.stringify(users, null, 2));
  let corrected = 0;
  for (const user of users) {
    await db.$transaction(async tx => { await reconcileStudyXp(tx, user.id); await syncStudyStreak(tx, user.id); }, { timeout: 30000 });
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (after.xp !== user.xp || after.streak !== user.streak) corrected++;
  }
  console.log("Saldos conciliados a partir do histórico persistido: " + corrected + " de " + users.length + " contas locais. Snapshot anterior salvo em .codex.");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
