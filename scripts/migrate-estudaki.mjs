import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

const dbPath = join(process.cwd(), "prisma", "dev.db");
const db = new DatabaseSync(dbPath);

function columnExists(table, column) {
  const rows = db.prepare(`PRAGMA table_info("${table}")`).all();
  return rows.some((row) => row.name === column);
}

function tableExists(table) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  return Boolean(row);
}

if (!columnExists("Material", "priceCents")) {
  db.exec('ALTER TABLE "Material" ADD COLUMN "priceCents" INTEGER NOT NULL DEFAULT 0;');
}

if (!columnExists("Material", "purchaseUrl")) {
  db.exec('ALTER TABLE "Material" ADD COLUMN "purchaseUrl" TEXT;');
}

if (!columnExists("Exam", "answerKeyUrl")) {
  db.exec('ALTER TABLE "Exam" ADD COLUMN "answerKeyUrl" TEXT;');
}

if (!columnExists("Exam", "sourceUrl")) {
  db.exec('ALTER TABLE "Exam" ADD COLUMN "sourceUrl" TEXT;');
}

if (!columnExists("Exam", "imageUrl")) {
  db.exec('ALTER TABLE "Exam" ADD COLUMN "imageUrl" TEXT;');
}

if (!columnExists("Exam", "questionCount")) {
  db.exec('ALTER TABLE "Exam" ADD COLUMN "questionCount" INTEGER;');
}

if (!columnExists("Exam", "durationMinutes")) {
  db.exec('ALTER TABLE "Exam" ADD COLUMN "durationMinutes" INTEGER;');
}

if (!columnExists("Exam", "official")) {
  db.exec('ALTER TABLE "Exam" ADD COLUMN "official" BOOLEAN NOT NULL DEFAULT true;');
}

if (!tableExists("VideoLike")) {
  db.exec(`
    CREATE TABLE "VideoLike" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "videoId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VideoLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "VideoLike_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX "VideoLike_userId_videoId_key" ON "VideoLike"("userId", "videoId");
  `);
}

if (!tableExists("VideoSave")) {
  db.exec(`
    CREATE TABLE "VideoSave" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "videoId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VideoSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "VideoSave_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX "VideoSave_userId_videoId_key" ON "VideoSave"("userId", "videoId");
  `);
}

if (!tableExists("VideoComment")) {
  db.exec(`
    CREATE TABLE "VideoComment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "videoId" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VideoComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "VideoComment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
}

db.close();
console.log("Migracao EstudAki aplicada.");
