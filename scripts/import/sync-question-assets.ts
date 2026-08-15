import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

type StoredAlternative = {
  key?: string;
  letter?: string;
  letra?: string;
  text?: string;
  texto?: string;
  imageUrl?: string | null;
};

type StoredImage =
  | string
  | {
      url?: string;
      description?: string;
      altText?: string;
      order?: number;
      width?: number;
      height?: number;
    };

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeKey(value: unknown, index: number) {
  const fallback = String.fromCharCode(65 + index);
  return String(value ?? fallback).trim().toUpperCase().slice(0, 1) || fallback;
}

async function main() {
  const questions = await db.question.findMany({
    select: {
      id: true,
      alternatives: true,
      alternativeExplanations: true,
      correctAlternative: true,
      imageUrl: true,
      images: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const alternatives = questions.flatMap((question) => {
    const parsed = parseJson<StoredAlternative[]>(question.alternatives, []);
    const explanations = parseJson<Record<string, string>>(question.alternativeExplanations, {});

    return parsed
      .map((item, index) => {
        const key = normalizeKey(item.key ?? item.letter ?? item.letra, index);
        const text = String(item.text ?? item.texto ?? "").trim();
        if (!key || !text) return null;
        return {
          id: randomUUID(),
          questionId: question.id,
          key,
          text,
          imageUrl: item.imageUrl ?? null,
          explanation: explanations[key] ?? null,
          correct: key === question.correctAlternative,
          order: index,
          createdAt: now,
          updatedAt: now,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  });

  const images = questions.flatMap((question) => {
    const parsed = parseJson<StoredImage[]>(question.images, []);
    const seen = new Set<string>();
    const items: Array<{
      id: string;
      questionId: string;
      url: string;
      description: string | null;
      altText: string | null;
      order: number;
      width: number | null;
      height: number | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    const addImage = (entry: StoredImage, index: number) => {
      const url = typeof entry === "string" ? entry : entry.url;
      if (!url || seen.has(url)) return;
      seen.add(url);
      items.push({
        id: randomUUID(),
        questionId: question.id,
        url,
        description: typeof entry === "string" ? null : entry.description ?? null,
        altText: typeof entry === "string" ? null : entry.altText ?? null,
        order: typeof entry === "string" ? index : entry.order ?? index,
        width: typeof entry === "string" ? null : entry.width ?? null,
        height: typeof entry === "string" ? null : entry.height ?? null,
        createdAt: now,
        updatedAt: now,
      });
    };

    parsed.forEach(addImage);
    if (question.imageUrl) addImage(question.imageUrl, items.length);
    return items;
  });

  await db.$transaction([
    db.questionAlternative.deleteMany({}),
    db.questionImage.deleteMany({}),
  ]);

  for (let index = 0; index < alternatives.length; index += 1000) {
    await db.questionAlternative.createMany({ data: alternatives.slice(index, index + 1000) });
  }

  for (let index = 0; index < images.length; index += 500) {
    await db.questionImage.createMany({ data: images.slice(index, index + 500) });
  }

  console.log(
    JSON.stringify(
      {
        questions: questions.length,
        alternatives: alternatives.length,
        images: images.length,
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
  .finally(async () => db.$disconnect());
