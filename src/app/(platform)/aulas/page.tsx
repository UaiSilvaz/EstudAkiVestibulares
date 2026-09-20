import { ContentStatus } from "@prisma/client";
import { LessonMarketplace } from "@/components/lesson-marketplace";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { platformCourses } from "@/lib/platform-data";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const priceByIndex = [4970, 6970, 3970, 5970, 7470, 5270] as const;

function exampleLessons(title: string, discipline: string) {
  return [
    `${discipline}: mapa da prova e prioridades`,
    `${discipline}: fundamentos para ganhar velocidade`,
    `${title}: resolucao comentada de questoes`,
  ];
}

async function ensureCourseProduct(course: (typeof platformCourses)[number], index: number) {
  const priceCents = priceByIndex[index % priceByIndex.length];
  const slug = `aulas-${course.slug}`;
  const existing = await db.product.findUnique({
    where: { slug },
    select: { materialId: true },
  });
  const materialId =
    existing?.materialId ??
    (
      await db.material.create({
        data: {
          title: `Curso: ${course.title}`,
          category: "Aulas",
          premium: true,
          priceCents,
          description: course.summary,
          status: ContentStatus.PUBLISHED,
        },
        select: { id: true },
      })
    ).id;

  return db.product.upsert({
    where: { slug },
    update: {
      materialId,
      name: course.title,
      description: course.summary,
      priceCents,
      status: ContentStatus.PUBLISHED,
    },
    create: {
      slug,
      materialId,
      name: course.title,
      description: course.summary,
      priceCents,
      status: ContentStatus.PUBLISHED,
    },
  });
}

export default async function AulasPage() {
  const { activePreparation } = await getPlatformPageContext();
  const products = await Promise.all(platformCourses.map(ensureCourseProduct));

  const courses = platformCourses.map((course, index) => ({
    productId: products[index].id,
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    discipline: course.discipline,
    teacher: course.teacher,
    level: course.level,
    lessons: course.lessons,
    duration: course.duration,
    priceCents: products[index].priceCents,
    coverTone: course.coverTone,
    examples: exampleLessons(course.title, course.discipline),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aulas premium"
        title="Cursos para assistir"
        description="Veja aulas de exemplo por curso. O play abre o bloqueio premium e envia a compra para o carrinho."
      />
      <LessonMarketplace
        courses={courses}
        activeName={activePreparation?.displayName ?? "sua preparacao"}
      />
    </div>
  );
}
