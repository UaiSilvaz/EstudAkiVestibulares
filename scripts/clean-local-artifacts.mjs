import { rm } from "node:fs/promises";

const targets = [
  ".next",
  ".turbo",
  ".codex-runtime",
  ".codex-tmp",
  ".npm-cache",
  "logs",
  "test-artifacts",
  ".codex-dev.log",
  ".codex-dev-3107.log",
  ".dev-server.err.log",
  ".dev-server.out.log",
  "dev-server-3000.err.log",
  "dev-server-3000.log",
  "dev-server-pilot.err.log",
  "dev-server-pilot.log",
  "dev-server-provas-antigas.err.log",
  "dev-server-provas-antigas.log",
];

for (const target of targets) {
  await rm(target, { force: true, recursive: true });
}

console.log("Artefatos locais removidos. data/ e storage/ foram preservados.");
