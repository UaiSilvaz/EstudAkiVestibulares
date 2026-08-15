import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const { registerManifestInDatabase } = await import("../src/lib/old-exams");
  const count = await registerManifestInDatabase();
  console.log(`${count} provas antigas cadastradas ou atualizadas.`);
}

main().catch((error) => {
  console.error("Não foi possível cadastrar as provas antigas no banco.", error);
  process.exitCode = 1;
});
