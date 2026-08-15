import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

const command = process.argv[2];
if (!["dev", "build", "start"].includes(command)) {
  console.error("Uso: node scripts/run-next-with-system-ca.mjs <dev|build|start>");
  process.exit(1);
}

const nextCli = new URL("../node_modules/next/dist/bin/next", import.meta.url);
const result = spawnSync(process.execPath, [fileURLToPath(nextCli), command, ...process.argv.slice(3)], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_USE_SYSTEM_CA: "1",
  },
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
