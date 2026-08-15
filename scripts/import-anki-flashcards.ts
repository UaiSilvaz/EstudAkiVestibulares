import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { db } from "../src/lib/db";

loadEnvConfig(process.cwd());

type ExtractedCard = {
  subject: string;
  deck: string;
  front: string;
  back: string;
  sourceFile: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const aliases: Record<string, string> = {
  "lingua-portuguesa": "portugues",
};

async function main() {
const source = JSON.parse(
  await readFile("data/flashcards/anki-flashcards.json", "utf8"),
) as { items: ExtractedCard[] };
const subjects = await db.subject.findMany();
const subjectBySlug = new Map(subjects.map((subject) => [subject.slug, subject]));
const subjectByName = new Map(subjects.map((subject) => [normalize(subject.name), subject]));
const topicCache = new Map<string, string>();

await db.flashcard.deleteMany({ where: { source: "ANKI_DATA" } });

const data = [];
for (const item of source.items) {
  const normalizedSubject = normalize(item.subject);
  const subject =
    subjectBySlug.get(aliases[normalizedSubject] ?? normalizedSubject) ??
    subjectByName.get(aliases[normalizedSubject] ?? normalizedSubject);
  if (!subject) continue;

  const topicKey = `${subject.id}:${item.deck}`;
  let topicId = topicCache.get(topicKey);
  if (!topicId) {
    const slug = `flash-${subject.slug}-${normalize(item.deck)}`.slice(0, 180);
    const topic = await db.topic.upsert({
      where: { slug },
      update: { name: item.deck, subjectId: subject.id },
      create: { slug, name: item.deck, subjectId: subject.id },
    });
    topicId = topic.id;
    topicCache.set(topicKey, topicId);
  }
  data.push({
    subjectId: subject.id,
    topicId,
    deck: item.deck,
    source: "ANKI_DATA",
    front: item.front,
    back: item.back,
    shared: true,
    status: "PUBLISHED" as const,
  });
}

for (let index = 0; index < data.length; index += 500) {
  await db.flashcard.createMany({ data: data.slice(index, index + 500) });
}

console.log(JSON.stringify({ extracted: source.items.length, imported: data.length, decks: topicCache.size }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
