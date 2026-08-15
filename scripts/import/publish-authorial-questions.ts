import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

async function main() {
  const result = await db.question.updateMany({
    where: { sourceType: "AUTHORIAL", status: { in: ["DRAFT", "REVIEW"] } },
    data: { status: "PUBLISHED" },
  });
  const published = await db.question.count({ where: { sourceType: "AUTHORIAL", status: "PUBLISHED" } });
  console.log(JSON.stringify({ updated: result.count, publishedAuthorial: published }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
