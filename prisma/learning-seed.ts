import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ContentStatus,
  Difficulty,
  LessonNodeType,
  MaterialType,
  PrismaClient,
} from "@prisma/client";

const alternatives = (items: Array<[string, string]>) =>
  JSON.stringify(items.map(([key, text]) => ({ key, text, correct: false })));

function demoVideoUrl() {
  const demoDir = join(process.cwd(), "public", "demo");
  if (!existsSync(demoDir)) return null;
  const file = readdirSync(demoDir).find((item) => /\.(mp4|webm|m4v|mov)$/i.test(item));
  return file ? `/demo/${file}` : null;
}

const questionSeeds = [
  ["Qual é o resultado de 18 + 24 x 2?", "A", "66", "A multiplicação vem antes da soma: 24 x 2 = 48; 48 + 18 = 66."],
  ["Uma fração equivalente a 3/4 é:", "C", "6/8", "Multiplicar numerador e denominador por 2 mantém o mesmo valor."],
  ["Se 20% de um valor é 36, qual é o valor total?", "D", "180", "36 representa 0,2 do total. Então total = 36 / 0,2 = 180."],
  ["A razão entre 12 e 18 simplificada é:", "B", "2/3", "Divida ambos os termos por 6: 12/18 = 2/3."],
  ["Em uma proporção, se 4 cadernos custam R$ 28, 7 cadernos custam:", "E", "R$ 49", "Cada caderno custa R$ 7; 7 cadernos custam R$ 49."],
  ["Na função f(x)=2x+5, o valor de f(3) é:", "A", "11", "Substitua x por 3: 2 x 3 + 5 = 11."],
  ["A equação 3x - 9 = 0 tem solução:", "C", "3", "Somando 9 dos dois lados, 3x = 9, logo x = 3."],
  ["O gráfico de uma função afim é uma:", "B", "reta", "Toda função do tipo ax+b possui gráfico linear."],
  ["A área de um retângulo de 9 cm por 5 cm é:", "D", "45 cm²", "A área do retângulo é a base multiplicada pela altura: 9 x 5 = 45."],
  ["A soma dos ângulos internos de um triângulo é:", "A", "180 graus", "Esse é um resultado básico da geometria plana."],
  ["A média de 6, 8, 10 e 12 é:", "C", "9", "Some 36 e divida por 4."],
  ["Em um conjunto de dados, a moda é:", "E", "o valor que mais se repete", "Moda mede frequência, não posição central."],
  ["Se uma probabilidade é 1/4, em porcentagem ela vale:", "B", "25%", "1 dividido por 4 é 0,25, ou 25%."],
  ["Um desconto de 10% em R$ 80 resulta em:", "D", "R$ 72", "10% de 80 é 8; 80 - 8 = 72."],
  ["Um checkpoint serve principalmente para:", "A", "verificar se a base está pronta para avançar", "A ideia é checar pré-requisitos antes da próxima unidade."],
] as const;

const moduleSeeds = [
  {
    slug: "fundamentos-matematica-enem",
    eyebrow: "UNIDADE 01",
    title: "Fundamentos",
    description: "Operações, frações, porcentagem, razão e proporção.",
    color: "#1E73FF",
    lessons: [
      ["VIDEO", "Boas-vindas", "Como usar a trilha para estudar sem se perder.", 8, 50, true],
      ["VIDEO", "Operações básicas", "Prioridade das operações e cálculo mental seguro.", 18, 50, false],
      ["QUESTIONS", "Pratique operações", "Cinco questões rápidas para aquecer.", 12, 60, false],
      ["VIDEO", "Frações sem medo", "Equivalência, simplificação e comparação.", 22, 50, false],
      ["QUESTIONS", "Treinando frações", "Aplicações diretas de frações.", 14, 60, false],
      ["REVIEW", "Revisão rápida", "Resumo ativo dos erros mais comuns.", 10, 40, false],
      ["VIDEO", "Razão e proporção", "Regra de três com interpretação.", 20, 50, false],
      ["CHECKPOINT", "Checkpoint fundamentos", "Valide a base antes de seguir.", 15, 100, false],
      ["REWARD", "Baú de conclusão", "Recompensa do primeiro módulo.", 3, 100, false],
    ],
  },
  {
    slug: "algebra-enem",
    eyebrow: "UNIDADE 02",
    title: "Álgebra",
    description: "Equações, expressões e leitura algébrica de problemas.",
    color: "#F97316",
    lessons: [
      ["VIDEO", "Linguagem algébrica", "Transforme texto em expressão.", 19, 50, false],
      ["VIDEO", "Equações do primeiro grau", "Isole a incógnita com segurança.", 21, 50, false],
      ["QUESTIONS", "Lista de equações", "Treino curto com feedback imediato.", 12, 60, false],
      ["VIDEO", "Produtos notáveis", "Reconheça padrões antes de expandir.", 24, 50, false],
      ["QUESTIONS", "Álgebra aplicada", "Problemas de contexto ENEM.", 16, 60, false],
      ["REVIEW", "Revisão de álgebra", "Erros comuns e atalhos válidos.", 10, 40, false],
      ["VIDEO", "Inequações", "Intervalos e interpretação na reta.", 19, 50, false],
      ["CHECKPOINT", "Checkpoint álgebra", "70% para liberar funções.", 15, 100, false],
      ["SIMULATION", "Simulado de álgebra", "Mini simulado com tempo.", 15, 150, false],
    ],
  },
  {
    slug: "funcoes-enem",
    eyebrow: "UNIDADE 03",
    title: "Dominando funções",
    description: "Função afim, quadrática, gráficos e modelagem.",
    color: "#22C55E",
    lessons: [
      ["VIDEO", "Ideia de função", "Entrada, saída, domínio e imagem.", 18, 50, false],
      ["VIDEO", "Função afim", "Coeficientes e leitura do gráfico.", 24, 50, false],
      ["QUESTIONS", "Gráficos de retas", "Interprete inclinação e intercepto.", 15, 60, false],
      ["VIDEO", "Função quadrática", "Vértice, raízes e concavidade.", 26, 50, false],
      ["QUESTIONS", "Modelagem por funções", "Situações-problema de prova.", 18, 60, false],
      ["CHECKPOINT", "Checkpoint funções", "Confirme a leitura gráfica.", 15, 100, false],
      ["REWARD", "Badge gráficos", "Prêmio por completar funções.", 3, 120, false],
    ],
  },
  {
    slug: "geometria-enem",
    eyebrow: "UNIDADE 04",
    title: "Geometria",
    description: "Área, perímetro, semelhança, triângulos e escala.",
    color: "#A855F7",
    lessons: [
      ["VIDEO", "Área e perímetro", "Separe grandezas antes de calcular.", 18, 50, false],
      ["QUESTIONS", "Figuras planas", "Cálculo e interpretação geométrica.", 14, 60, false],
      ["VIDEO", "Triângulos", "Ângulos, semelhança e Pitágoras.", 25, 50, false],
      ["MATERIAL", "Resumo de fórmulas", "PDF com fórmulas essenciais.", 5, 30, false],
      ["CHECKPOINT", "Checkpoint geometria", "Teste rápido da unidade.", 15, 100, false],
    ],
  },
  {
    slug: "estatistica-enem",
    eyebrow: "UNIDADE 05",
    title: "Estatística",
    description: "Média, mediana, moda, gráficos e probabilidade.",
    color: "#FACC15",
    lessons: [
      ["VIDEO", "Medidas de tendência", "Média, mediana e moda na prática.", 20, 50, false],
      ["QUESTIONS", "Leitura de gráficos", "Tabelas, barras e setores.", 15, 60, false],
      ["VIDEO", "Probabilidade essencial", "Eventos simples e porcentagens.", 22, 50, false],
      ["SIMULATION", "Simulado final", "Fechamento do curso com desempenho.", 20, 200, false],
      ["FINAL", "Conclusão do curso", "Certificado simulado e estatísticas.", 4, 1000, false],
    ],
  },
] as const;

export async function seedLearningCourses(prisma: PrismaClient) {
  const [teacher, enem, matematica] = await Promise.all([
    prisma.user.findFirst({ where: { role: "TEACHER" }, orderBy: { createdAt: "asc" } }),
    prisma.vestibular.findUnique({ where: { slug: "enem" } }),
    prisma.subject.findUnique({ where: { slug: "matematica" } }),
  ]);
  if (!teacher || !enem || !matematica) return;

  const topic =
    (await prisma.topic.findFirst({ where: { slug: "funcoes" } })) ??
    (await prisma.topic.create({ data: { subjectId: matematica.id, name: "Funções", slug: "funcoes-demo" } }));

  const questions = [];
  for (const [statement, correctAlternative, correctText, explanation] of questionSeeds) {
    const question = await prisma.question.upsert({
      where: { contentHash: `learning-demo:${statement}` },
      update: {
        statement,
        correctAlternative,
        explanation,
        status: ContentStatus.PUBLISHED,
        reviewState: "APPROVED",
      },
      create: {
        vestibularId: enem.id,
        subjectId: matematica.id,
        topicId: topic.id,
        authorId: teacher.id,
        year: 2026,
        difficulty: Difficulty.MEDIUM,
        statement,
        alternatives: alternatives([
          ["A", correctAlternative === "A" ? correctText : "12"],
          ["B", correctAlternative === "B" ? correctText : "25%"],
          ["C", correctAlternative === "C" ? correctText : "9"],
          ["D", correctAlternative === "D" ? correctText : "180"],
          ["E", correctAlternative === "E" ? correctText : "R$ 49"],
        ]),
        correctAlternative,
        explanation,
        pedagogyComment: "Questão demonstrativa criada para a trilha Norte Preparatórios.",
        tags: JSON.stringify(["curso", "matematica", "enem"]),
        source: "Norte Preparatórios demo",
        sourceType: "AUTHORIAL",
        reviewState: "APPROVED",
        status: ContentStatus.PUBLISHED,
        contentHash: `learning-demo:${statement}`,
      },
    });
    questions.push(question);
  }

  const course = await prisma.course.upsert({
    where: { slug: "matematica-enem-do-zero-a-aprovacao" },
    update: {
      teacherId: teacher.id,
      subjectId: matematica.id,
      title: "Matemática ENEM - Do Zero à Aprovação",
      description: "Um curso completo para construir base, ganhar velocidade e evoluir por videoaulas, questões, checkpoints e simulados.",
      shortDescription: "Matemática ENEM com trilha gamificada, feedback e desbloqueio progressivo.",
      category: "ENEM",
      level: "Base",
      priceCents: 14990,
      isFree: false,
      published: true,
      featured: true,
      status: ContentStatus.PUBLISHED,
      coverUrl: "/assets/norte-design/06_Capas_Digitais/enem-exatas-natureza.svg",
      thumbnail: "/assets/norte-design/06_Capas_Digitais/enem-exatas-natureza.svg",
      coverImage: "/assets/norte-design/06_Capas_Digitais/enem-exatas-natureza.svg",
      totalDurationSeconds: 36 * 60 * 60,
      navigationMode: "SEQUENTIAL",
      visualTheme: { primary: "#FF6201", secondary: "#272B31", accent: "#F5F6F8" },
      benefits: ["Videoaulas Norte Preparatórios", "5 unidades em trilha visual", "Questões com feedback", "Checkpoints e mini simulados", "Certificado simulado"],
      rating: 4.9,
      studentsCount: 1284,
    },
    create: {
      teacherId: teacher.id,
      subjectId: matematica.id,
      slug: "matematica-enem-do-zero-a-aprovacao",
      title: "Matemática ENEM - Do Zero à Aprovação",
      description: "Um curso completo para construir base, ganhar velocidade e evoluir por videoaulas, questões, checkpoints e simulados.",
      shortDescription: "Matemática ENEM com trilha gamificada, feedback e desbloqueio progressivo.",
      category: "ENEM",
      level: "Base",
      priceCents: 14990,
      isFree: false,
      published: true,
      featured: true,
      status: ContentStatus.PUBLISHED,
      coverUrl: "/assets/norte-design/06_Capas_Digitais/enem-exatas-natureza.svg",
      thumbnail: "/assets/norte-design/06_Capas_Digitais/enem-exatas-natureza.svg",
      coverImage: "/assets/norte-design/06_Capas_Digitais/enem-exatas-natureza.svg",
      totalDurationSeconds: 36 * 60 * 60,
      navigationMode: "SEQUENTIAL",
      visualTheme: { primary: "#FF6201", secondary: "#272B31", accent: "#F5F6F8" },
      benefits: ["Videoaulas Norte Preparatórios", "5 unidades em trilha visual", "Questões com feedback", "Checkpoints e mini simulados", "Certificado simulado"],
      rating: 4.9,
      studentsCount: 1284,
    },
  });

  const existingCourseMaterial = await prisma.material.findFirst({
    where: { title: `Curso - ${course.title}` },
  });
  const courseMaterialData = {
    title: `Curso - ${course.title}`,
    description: course.shortDescription,
    category: "Cursos",
    subjectId: matematica.id,
    topicId: topic.id,
    type: MaterialType.PDF,
    premium: true,
    priceCents: course.priceCents,
    fileUrl: "/referencias/cartilha-redacao-enem-2025.pdf",
    status: ContentStatus.PUBLISHED,
  };
  const courseMaterial = existingCourseMaterial
    ? await prisma.material.update({ where: { id: existingCourseMaterial.id }, data: courseMaterialData })
    : await prisma.material.create({ data: courseMaterialData });

  const product = await prisma.product.upsert({
    where: { slug: "curso-matematica-enem-do-zero-a-aprovacao" },
    update: {
      materialId: courseMaterial.id,
      name: course.title,
      description: course.shortDescription,
      priceCents: course.priceCents,
      coverUrl: course.coverImage,
      status: ContentStatus.PUBLISHED,
    },
    create: {
      slug: "curso-matematica-enem-do-zero-a-aprovacao",
      materialId: courseMaterial.id,
      name: course.title,
      description: course.shortDescription,
      priceCents: course.priceCents,
      coverUrl: course.coverImage,
      status: ContentStatus.PUBLISHED,
    },
  });

  await prisma.courseProduct.upsert({
    where: { courseId_productId: { courseId: course.id, productId: product.id } },
    update: {},
    create: { courseId: course.id, productId: product.id },
  });

  const videoUrl = demoVideoUrl();
  let questionCursor = 0;
  for (const [moduleIndex, moduleSeed] of moduleSeeds.entries()) {
    const moduleRecord = await prisma.module.upsert({
      where: { slug: moduleSeed.slug },
      update: {
        title: moduleSeed.title,
        description: moduleSeed.description,
        eyebrow: moduleSeed.eyebrow,
        color: moduleSeed.color,
      },
      create: {
        slug: moduleSeed.slug,
        title: moduleSeed.title,
        description: moduleSeed.description,
        eyebrow: moduleSeed.eyebrow,
        color: moduleSeed.color,
      },
    });
    await prisma.courseModule.upsert({
      where: { courseId_moduleId: { courseId: course.id, moduleId: moduleRecord.id } },
      update: { position: moduleIndex },
      create: { courseId: course.id, moduleId: moduleRecord.id, position: moduleIndex },
    });

    for (const [lessonIndex, item] of moduleSeed.lessons.entries()) {
      const [type, title, description, minutes, xpReward, preview] = item;
      const slug = `${moduleSeed.slug}-${lessonIndex + 1}`;
      const material =
        type === "MATERIAL"
          ? await (async () => {
              const existing = await prisma.material.findFirst({ where: { title: `Material - ${title}` } });
              const data = {
                title: `Material - ${title}`,
                description,
                category: "Cursos",
                subjectId: matematica.id,
                topicId: topic.id,
                type: MaterialType.PDF,
                fileUrl: "/referencias/cartilha-redacao-enem-2025.pdf",
                status: ContentStatus.PUBLISHED,
              };
              return existing
                ? prisma.material.update({ where: { id: existing.id }, data })
                : prisma.material.create({ data });
            })()
          : null;

      const lesson = await prisma.lesson.upsert({
        where: { slug },
        update: {
          title,
          description,
          type: type as LessonNodeType,
          videoUrl: type === "VIDEO" ? videoUrl : null,
          materialId: material?.id ?? null,
          subjectId: matematica.id,
          topicId: topic.id,
          durationSeconds: minutes * 60,
          xpReward,
          isFreePreview: preview,
          isFree: preview,
          status: ContentStatus.PUBLISHED,
          content: `Nesta atividade você vai estudar ${description.toLowerCase()} com foco em aplicação real no ENEM.`,
          resources: [
            { title: "Resumo da aula", type: "PDF", href: "/referencias/cartilha-redacao-enem-2025.pdf" },
            { title: "Lista de exercícios", type: "SHEET", href: "/questions?vestibular=enem" },
          ],
          outcomes: ["Reconhecer o conceito central", "Aplicar em questões contextualizadas", "Evitar erros comuns de prova"],
        },
        create: {
          slug,
          title,
          description,
          type: type as LessonNodeType,
          videoUrl: type === "VIDEO" ? videoUrl : null,
          materialId: material?.id ?? null,
          subjectId: matematica.id,
          topicId: topic.id,
          durationSeconds: minutes * 60,
          xpReward,
          isFreePreview: preview,
          isFree: preview,
          status: ContentStatus.PUBLISHED,
          content: `Nesta atividade você vai estudar ${description.toLowerCase()} com foco em aplicação real no ENEM.`,
          resources: [
            { title: "Resumo da aula", type: "PDF", href: "/referencias/cartilha-redacao-enem-2025.pdf" },
            { title: "Lista de exercícios", type: "SHEET", href: "/questions?vestibular=enem" },
          ],
          outcomes: ["Reconhecer o conceito central", "Aplicar em questões contextualizadas", "Evitar erros comuns de prova"],
        },
      });

      await prisma.moduleLesson.upsert({
        where: { moduleId_lessonId: { moduleId: moduleRecord.id, lessonId: lesson.id } },
        update: { position: lessonIndex },
        create: { moduleId: moduleRecord.id, lessonId: lesson.id, position: lessonIndex },
      });
      await prisma.lessonAuthor.upsert({
        where: { lessonId_userId_role: { lessonId: lesson.id, userId: teacher.id, role: "AUTHOR" } },
        update: {},
        create: { lessonId: lesson.id, userId: teacher.id, role: "AUTHOR" },
      });

      if (["QUESTIONS", "CHECKPOINT", "REVIEW"].includes(type)) {
        for (let order = 0; order < 5; order++) {
          const question = questions[questionCursor % questions.length];
          questionCursor += 1;
          await prisma.lessonQuestion.upsert({
            where: { lessonId_questionId: { lessonId: lesson.id, questionId: question.id } },
            update: { order, xpReward: type === "CHECKPOINT" ? 20 : 10 },
            create: { lessonId: lesson.id, questionId: question.id, order, xpReward: type === "CHECKPOINT" ? 20 : 10 },
          });
        }
      }

      if (type === "SIMULATION") {
        const questionIds = questions.slice(0, 10).map((question) => question.id);
        await prisma.simulation.upsert({
          where: { id: `sim-${slug}` },
          update: {
            courseId: course.id,
            moduleId: moduleRecord.id,
            lessonId: lesson.id,
            title,
            description,
            questionIds,
            durationMinutes: minutes,
            xpReward,
          },
          create: {
            id: `sim-${slug}`,
            courseId: course.id,
            moduleId: moduleRecord.id,
            lessonId: lesson.id,
            title,
            description,
            questionIds,
            durationMinutes: minutes,
            xpReward,
          },
        });
      }

      if (type === "REWARD") {
        await prisma.reward.upsert({
          where: { slug: `reward-${slug}` },
          update: {
            courseId: course.id,
            moduleId: moduleRecord.id,
            lessonId: lesson.id,
            title,
            description,
            xpReward,
            badge: moduleIndex === 0 ? "Primeiro módulo" : "Módulo concluído",
          },
          create: {
            slug: `reward-${slug}`,
            courseId: course.id,
            moduleId: moduleRecord.id,
            lessonId: lesson.id,
            title,
            description,
            xpReward,
            badge: moduleIndex === 0 ? "Primeiro módulo" : "Módulo concluído",
          },
        });
      }
    }
  }
}
