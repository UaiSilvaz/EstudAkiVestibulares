import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { cliValue } from "./pilot-2022-day2";
import { writePilotSnapshot } from "./pilot-db-snapshot";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

async function main() {
  const result = await writePilotSnapshot(db, "backup", cliValue("output"));
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
