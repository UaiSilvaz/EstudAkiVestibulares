import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const dbPath = join(root, "prisma", "dev.db");
const prismaCli = join(root, "node_modules", "prisma", "build", "index.js");

mkdirSync(dirname(dbPath), { recursive: true });

if (existsSync(dbPath)) {
  unlinkSync(dbPath);
}

const sql = execFileSync(
  process.execPath,
  [
    prismaCli,
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    "prisma/schema.prisma",
    "--script",
  ],
  { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = OFF;");
db.exec(sql);
db.exec("PRAGMA foreign_keys = ON;");
db.close();

console.log(`SQLite criado em ${dbPath}`);
