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
  ["Qual e o resultado de 18 + 24 x 2?", "A", "66", "A multiplicacao vem antes da soma: 24 x 2 = 48; 48 + 18 = 66."],
  ["Uma fracao equivalente a 3/4 e:", "C", "6/8", "Multiplicar numerador e denominador por 2 mantem o mesmo valor."],
  ["Se 20% de um valor e 36, qual e o valor total?", "D", "180", "36 representa 0,2 do total. Entao total = 36 / 0,2 = 180."],
  ["A razao entre 12 e 18 simplificada e:", "B", "2/3", "Divida ambos os termos por 6: 12/18 = 2/3."],
  ["Em uma proporcao, se 4 cadernos custam R$ 28, 7 cadernos custam:", "E", "R$ 49", "Cada caderno custa R$ 7; 7 cadernos custam R$ 49."],
  ["Na funcao f(x)=2x+5, o valor de f(3) e:", "A", "11", "Substitua x por 3: 2 x 3 + 5 = 11."],
  ["A equacao 3x - 9 = 0 tem solucao:", "C", "3", "Somando 9 dos dois lados, 3x = 9, logo x = 3."],
  ["O grafico de uma funcao afim e uma:", "B", "reta", "Toda funcao do tipo ax+b possui grafico linear."],
  ["A area de um retangulo 9 cm por 5 cm e:", "D", "45 cm2", "Area do retangulo e base vezes altura: 9 x 5 = 45."],
  ["A soma dos angulos internos de um triangulo e:", "A", "180 graus", "Esse e um resultado basico da geometria plana."],
  ["A media de 6, 8, 10 e 12 e:", "C", "9", "Some 36 e divida por 4."],
  ["Em um conjunto de dados, a moda e:", "E", "o valor que mais se repete", "Moda mede frequencia, nao posicao central."],
  ["Se uma probabilidade e 1/4, em porcentagem ela vale:", "B", "25%", "1 dividido por 4 e 0,25, ou 25%."],
  ["Um desconto de 10% em R$ 80 resulta em:", "D", "R$ 72", "10% de 80 e 8; 80 - 8 = 72."],
  ["Um checkpoint serve principalmente para:", "A", "verificar se a base esta pronta para avancar", "A ideia e checar prerequisitos antes da proxima unidade."],
] as const;

const moduleSeeds = [
  {
    slug: "fundamentos-matematica-enem",
    eyebrow: "UNIDADE 01",
    title: "Fundamentos",
    description: "Operacoes, fracoes, porcentagem, razao e proporcao.",
    color: "#1E73FF",
    lessons: [
      ["VIDEO", "Boas-vindas", "Como usar a trilha para estudar sem se perder.", 8, 50, true],
      ["VIDEO", "Operacoes basicas", "Prioridade das operacoes e calculo mental seguro.", 18, 50, false],
      ["QUESTIONS", "Pratique operacoes", "Cinco questoes rapidas para aquecer.", 12, 60, false],
      ["VIDEO", "Fracoes sem medo", "Equivalencia, simplificacao e comparacao.", 22, 50, false],
      ["QUESTIONS", "Treinando fracoes", "Aplicacoes diretas de fracoes.", 14, 60, false],
      ["REVIEW", "Revisao rapida", "Resumo ativo dos erros mais comuns.", 10, 40, false],
      ["VIDEO", "Razao e proporcao", "Regra de tres com interpretacao.", 20, 50, false],
      ["CHECKPOINT", "Checkpoint fundamentos", "Valide a base antes de seguir.", 15, 100, false],
      ["REWARD", "Bau de conclusao", "Recompensa do primeiro modulo.", 3, 100, false],
    ],
  },
  {
    slug: "algebra-enem",
    eyebrow: "UNIDADE 02",
    title: "Algebra",
    description: "Equacoes, expressoes e leitura algebrica de problemas.",
    color: "#F97316",
    lessons: [
      ["VIDEO", "Linguagem algebrica", "Transforme texto em expressao.", 19, 50, false],
      ["VIDEO", "Equacoes do primeiro grau", "Isole a incognita com seguranca.", 21, 50, false],
      ["QUESTIONS", "Lista de equacoes", "Treino curto com feedback imediato.", 12, 60, false],
      ["VIDEO", "Produtos notaveis", "Reconheca padroes antes de expandir.", 24, 50, false],
      ["QUESTIONS", "Algebra aplicada", "Problemas de contexto ENEM.", 16, 60, false],
      ["REVIEW", "Revisao de algebra", "Erros comuns e atalhos validos.", 10, 40, false],
      ["VIDEO", "Inequacoes", "Intervalos e interpretacao na reta.", 19, 50, false],
      ["CHECKPOINT", "Checkpoint algebra", "70% para liberar funcoes.", 15, 100, false],
      ["SIMULATION", "Simulado de algebra", "Mini simulado com tempo.", 15, 150, false],
    ],
  },
  {
    slug: "funcoes-enem",
    eyebrow: "UNIDADE 03",
    title: "Dominando funcoes",
    description: "Funcao afim, quadratica, graficos e modelagem.",
    color: "#22C55E",
    lessons: [
      ["VIDEO", "Ideia de funcao", "Entrada, saida, dominio e imagem.", 18, 50, false],
      ["VIDEO", "Funcao afim", "Coeficientes e leitura do grafico.", 24, 50, false],
      ["QUESTIONS", "Graficos de retas", "Interprete inclinacao e intercepto.", 15, 60, false],
      ["VIDEO", "Funcao quadratica", "Vertice, raizes e concavidade.", 26, 50, false],
      ["QUESTIONS", "Modelagem por funcoes", "Situacoes-problema de prova.", 18, 60, false],
      ["CHECKPOINT", "Checkpoint funcoes", "Confirme a leitura grafica.", 15, 100, false],
      ["REWARD", "Badge graficos", "Premio por completar funcoes.", 3, 120, false],
    ],
  },
  {
    slug: "geometria-enem",
    eyebrow: "UNIDADE 04",
    title: "Geometria",
    description: "Area, perimetro, semelhanca, triangulos e escala.",
    color: "#A855F7",
    lessons: [
      ["VIDEO", "Area e perimetro", "Separe grandezas antes de calcular.", 18, 50, false],
      ["QUESTIONS", "Figuras planas", "Calculo e interpretacao geometrica.", 14, 60, false],
      ["VIDEO", "Triangulos", "Angulos, semelhanca e Pitagoras.", 25, 50, false],
      ["MATERIAL", "Resumo de formulas", "PDF com formulas essenciais.", 5, 30, false],
      ["CHECKPOINT", "Checkpoint geometria", "Teste rapido da unidade.", 15, 100, false],
    ],
  },
  {
    slug: "estatistica-enem",
    eyebrow: "UNIDADE 05",
    title: "Estatistica",
    description: "Media, mediana, moda, graficos e probabilidade.",
    color: "#FACC15",
    lessons: [
      ["VIDEO", "Medidas de tendencia", "Media, mediana e moda na pratica.", 20, 50, false],
      ["QUESTIONS", "Leitura de graficos", "Tabelas, barras e setores.", 15, 60, false],
      ["VIDEO", "Probabilidade essencial", "Eventos simples e porcentagens.", 22, 50, false],
      ["SIMULATION", "Simulado final", "Fechamento do curso com desempenho.", 20, 200, false],
      ["FINAL", "Conclusao do curso", "Certificado simulado e estatisticas.", 4, 1000, false],
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
    (await prisma.topic.create({ data: { subjectId: matematica.id, name: "Funcoes", slug: "funcoes-demo" } }));

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
        pedagogyComment: "Questao demonstrativa criada para a trilha EstudAki.",
        tags: JSON.stringify(["curso", "matematica", "enem"]),
        source: "EstudAki demo",
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
      title: "Matematica ENEM - Do Zero a Aprovacao",
      description: "Um curso completo para construir base, ganhar velocidade e evoluir por videoaulas, questoes, checkpoints e simulados.",
      shortDescription: "Matematica ENEM com trilha gamificada, feedback e desbloqueio progressivo.",
      category: "ENEM",
      level: "Base",
      priceCents: 14990,
      isFree: false,
      published: true,
      featured: true,
      status: ContentStatus.PUBLISHED,
      coverUrl: "/cadernos/CADERNO 1000 QUESTOES ENEM ESTUDAKI EXATAS.jpg",
      thumbnail: "/cadernos/CADERNO 1000 QUESTOES ENEM ESTUDAKI EXATAS.jpg",
      coverImage: "/cadernos/CADERNO 1000 QUESTOES ENEM ESTUDAKI EXATAS.jpg",
      totalDurationSeconds: 36 * 60 * 60,
      navigationMode: "SEQUENTIAL",
      visualTheme: { primary: "#1E73FF", secondary: "#F97316", accent: "#FACC15" },
      benefits: ["Videoaulas com player EstudAki", "5 unidades em trilha visual", "Questoes com feedback", "Checkpoints e mini simulados", "Certificado simulado"],
      rating: 4.9,
      studentsCount: 1284,
    },
    create: {
      teacherId: teacher.id,
      subjectId: matematica.id,
      slug: "matematica-enem-do-zero-a-aprovacao",
      title: "Matematica ENEM - Do Zero a Aprovacao",
      description: "Um curso completo para construir base, ganhar velocidade e evoluir por videoaulas, questoes, checkpoints e simulados.",
      shortDescription: "Matematica ENEM com trilha gamificada, feedback e desbloqueio progressivo.",
      category: "ENEM",
      level: "Base",
      priceCents: 14990,
      isFree: false,
      published: true,
      featured: true,
      status: ContentStatus.PUBLISHED,
      coverUrl: "/cadernos/CADERNO 1000 QUESTOES ENEM ESTUDAKI EXATAS.jpg",
      thumbnail: "/cadernos/CADERNO 1000 QUESTOES ENEM ESTUDAKI EXATAS.jpg",
      coverImage: "/cadernos/CADERNO 1000 QUESTOES ENEM ESTUDAKI EXATAS.jpg",
      totalDurationSeconds: 36 * 60 * 60,
      navigationMode: "SEQUENTIAL",
      visualTheme: { primary: "#1E73FF", secondary: "#F97316", accent: "#FACC15" },
      benefits: ["Videoaulas com player EstudAki", "5 unidades em trilha visual", "Questoes com feedback", "Checkpoints e mini simulados", "Certificado simulado"],
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
          content: `Nesta atividade voce vai estudar ${description.toLowerCase()} com foco em aplicacao real no ENEM.`,
          resources: [
            { title: "Resumo da aula", type: "PDF", href: "/referencias/cartilha-redacao-enem-2025.pdf" },
            { title: "Lista de exercicios", type: "SHEET", href: "/questions?vestibular=enem" },
          ],
          outcomes: ["Reconhecer o conceito central", "Aplicar em questoes contextualizadas", "Evitar erros comuns de prova"],
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
          content: `Nesta atividade voce vai estudar ${description.toLowerCase()} com foco em aplicacao real no ENEM.`,
          resources: [
            { title: "Resumo da aula", type: "PDF", href: "/referencias/cartilha-redacao-enem-2025.pdf" },
            { title: "Lista de exercicios", type: "SHEET", href: "/questions?vestibular=enem" },
          ],
          outcomes: ["Reconhecer o conceito central", "Aplicar em questoes contextualizadas", "Evitar erros comuns de prova"],
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
            badge: moduleIndex === 0 ? "Primeiro modulo" : "Modulo concluido",
          },
          create: {
            slug: `reward-${slug}`,
            courseId: course.id,
            moduleId: moduleRecord.id,
            lessonId: lesson.id,
            title,
            description,
            xpReward,
            badge: moduleIndex === 0 ? "Primeiro modulo" : "Modulo concluido",
          },
        });
      }
    }
  }
}
