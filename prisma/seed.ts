import bcrypt from "bcryptjs";
import {
  ActivityType,
  ContentStatus,
  Difficulty,
  MaterialType,
  PrismaClient,
  Role,
  VideoKind,
} from "@prisma/client";

const prisma = new PrismaClient();

const alternatives = (items: Array<[string, string]>) =>
  JSON.stringify(items.map(([key, text]) => ({ key, text })));

const tags = (...items: string[]) => JSON.stringify(items);

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);
  const adminHash = await bcrypt.hash("admin123", 10);
  const localAdminHash = await bcrypt.hash("Admin@123", 10);
  const teacherHash = await bcrypt.hash("prof123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@estudaki.com" },
    update: {},
    create: {
      name: "Guilherme Admin",
      email: "admin@estudaki.com",
      passwordHash: adminHash,
      role: Role.ADMIN,
      xp: 12800,
      streak: 42,
      league: "Diamante",
      weeklyHours: 20,
      targetExam: "ENEM",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@gmail" },
    update: {
      name: "Administrador EstudAki",
      passwordHash: localAdminHash,
      role: Role.ADMIN,
    },
    create: {
      name: "Administrador EstudAki",
      email: "admin@gmail",
      passwordHash: localAdminHash,
      role: Role.ADMIN,
      xp: 12800,
      streak: 42,
      league: "Diamante",
      weeklyHours: 20,
      targetExam: "ENEM",
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "prof@estudaki.com" },
    update: {},
    create: {
      name: "Prof. Pedro",
      email: "prof@estudaki.com",
      passwordHash: teacherHash,
      role: Role.TEACHER,
      xp: 8600,
      streak: 18,
      league: "Esmeralda",
      weeklyHours: 14,
      targetExam: "ENEM",
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "aluno@estudaki.com" },
    update: {},
    create: {
      name: "Guilherme",
      email: "aluno@estudaki.com",
      passwordHash,
      role: Role.STUDENT,
      xp: 2240,
      streak: 7,
      league: "Prata",
      weeklyHours: 10,
      targetExam: "ENEM",
    },
  });

  const vestibulares = await Promise.all(
    [
      ["ENEM", "enem", "#1E73FF", "Exame Nacional do Ensino Medio com foco em competencias, interpretacao e TRI."],
      ["FUVEST", "fuvest", "#0057B8", "Vestibular da USP com primeira e segunda fase."],
      ["UNICAMP", "unicamp", "#7C3AED", "Prova contextualizada com forte leitura interdisciplinar."],
      ["UNESP", "unesp", "#00A878", "Vestibular paulista com questoes objetivas e dissertativas."],
      ["FATEC", "fatec", "#EF4444", "Vestibular das Faculdades de Tecnologia do Centro Paula Souza."],
      ["ETEC", "etec", "#F59E0B", "Processo seletivo das Escolas Tecnicas Estaduais."],
    ].map(([name, slug, color, description]) =>
      prisma.vestibular.upsert({
        where: { slug },
        update: { name, color, description },
        create: { name, slug, color, description },
      }),
    ),
  );

  const [enem, fuvest, unicamp, unesp, fatec, etec] = vestibulares;

  const subjects = await Promise.all(
    [
      ["Matematica", "matematica", "#1E73FF", "Numeros, algebra, geometria, estatistica e raciocinio logico."],
      ["Linguagens", "linguagens", "#7C3AED", "Interpretacao, literatura, artes, gramatica e tecnologias."],
      ["Ciencias da Natureza", "natureza", "#22C55E", "Biologia, fisica, quimica e leitura de fenomenos."],
      ["Ciencias Humanas", "humanas", "#F59E0B", "Historia, geografia, filosofia, sociologia e atualidades."],
      ["Redacao", "redacao", "#EF4444", "Competencias, repertorio, argumentacao e proposta de intervencao."],
    ].map(([name, slug, color, description]) =>
      prisma.subject.upsert({
        where: { slug },
        update: { name, color, description },
        create: { name, slug, color, description },
      }),
    ),
  );

  const [matematica, linguagens, natureza, humanas, redacao] = subjects;

  const topicData = [
    [matematica.id, "Geometria Plana", "geometria-plana"],
    [matematica.id, "Funcoes", "funcoes"],
    [matematica.id, "Porcentagem", "porcentagem"],
    [linguagens.id, "Interpretacao de Texto", "interpretacao-texto"],
    [natureza.id, "Ecologia", "ecologia"],
    [natureza.id, "Termodinamica", "termodinamica"],
    [humanas.id, "Brasil Republica", "brasil-republica"],
    [redacao.id, "Competencia 3", "competencia-3"],
  ] as const;

  const topicRecords = await Promise.all(
    topicData.map(([subjectId, name, slug]) =>
      prisma.topic.upsert({
        where: { slug },
        update: { name, subjectId },
        create: { name, slug, subjectId },
      }),
    ),
  );

  const topic = Object.fromEntries(topicRecords.map((item) => [item.slug, item]));

  const questionSeed = [
    {
      vestibularId: enem.id,
      subjectId: matematica.id,
      topicId: topic["geometria-plana"].id,
      year: 2024,
      difficulty: Difficulty.EASY,
      statement:
        "Um terreno retangular possui 12 m de comprimento e 8 m de largura. Para cercar todo o terreno com uma volta de arame, qual sera o comprimento minimo de arame utilizado?",
      alternatives: alternatives([
        ["A", "20 m"],
        ["B", "40 m"],
        ["C", "48 m"],
        ["D", "96 m"],
        ["E", "120 m"],
      ]),
      correctAlternative: "B",
      explanation:
        "O perimetro do retangulo e 2 vezes a soma do comprimento com a largura: 2 x (12 + 8) = 40 m.",
      pedagogyComment:
        "Se voce marcou area, o erro foi trocar perimetro por superficie. Essa confusao aparece muito em questoes faceis.",
      tags: tags("perimetro", "base", "erro_conceitual"),
      source: "Questao modelo EstudAki",
      status: ContentStatus.PUBLISHED,
    },
    {
      vestibularId: enem.id,
      subjectId: matematica.id,
      topicId: topic["porcentagem"].id,
      year: 2023,
      difficulty: Difficulty.MEDIUM,
      statement:
        "Uma escola tinha 800 alunos. Apos uma campanha, o numero de inscritos em um simulado aumentou 15%. Quantos alunos passaram a participar do simulado?",
      alternatives: alternatives([
        ["A", "815"],
        ["B", "880"],
        ["C", "900"],
        ["D", "920"],
        ["E", "950"],
      ]),
      correctAlternative: "D",
      explanation:
        "15% de 800 e 120. Somando ao total inicial, 800 + 120 = 920 alunos.",
      pedagogyComment:
        "Treine transformar porcentagem em multiplicador: aumento de 15% equivale a multiplicar por 1,15.",
      tags: tags("porcentagem", "multiplicador", "enem"),
      source: "Questao modelo EstudAki",
      status: ContentStatus.PUBLISHED,
    },
    {
      vestibularId: fuvest.id,
      subjectId: matematica.id,
      topicId: topic["funcoes"].id,
      year: 2022,
      difficulty: Difficulty.HARD,
      statement:
        "Considere f(x) = 2x + 3. Se f(a) = 17, o valor de a e:",
      alternatives: alternatives([
        ["A", "5"],
        ["B", "6"],
        ["C", "7"],
        ["D", "8"],
        ["E", "10"],
      ]),
      correctAlternative: "C",
      explanation:
        "Substituindo f(a) por 17: 2a + 3 = 17. Logo, 2a = 14 e a = 7.",
      pedagogyComment:
        "A questao cobra leitura de funcao como maquina: entrada a, saida 17.",
      tags: tags("funcao-afim", "algebra"),
      source: "Questao modelo EstudAki",
      status: ContentStatus.PUBLISHED,
    },
    {
      vestibularId: enem.id,
      subjectId: linguagens.id,
      topicId: topic["interpretacao-texto"].id,
      year: 2024,
      difficulty: Difficulty.MEDIUM,
      statement:
        "Em textos argumentativos, a funcao principal dos conectivos e:",
      alternatives: alternatives([
        ["A", "Substituir a tese do autor"],
        ["B", "Organizar relacoes de sentido entre ideias"],
        ["C", "Eliminar marcas de autoria"],
        ["D", "Criar obrigatoriamente linguagem informal"],
        ["E", "Transformar argumentos em exemplos"],
      ]),
      correctAlternative: "B",
      explanation:
        "Conectivos indicam relacoes como causa, conclusao, contraste, adicao e consequencia.",
      pedagogyComment:
        "Em Linguagens, procure a funcao do recurso no texto, nao apenas o nome gramatical.",
      tags: tags("interpretacao", "conectivos", "linguagens"),
      source: "Questao modelo EstudAki",
      status: ContentStatus.PUBLISHED,
    },
    {
      vestibularId: unesp.id,
      subjectId: natureza.id,
      topicId: topic["ecologia"].id,
      year: 2021,
      difficulty: Difficulty.EASY,
      statement:
        "Em uma cadeia alimentar, organismos produtores sao aqueles que:",
      alternatives: alternatives([
        ["A", "Decompoem materia organica em sais minerais"],
        ["B", "Obtêm energia apenas consumindo herbivoros"],
        ["C", "Produzem materia organica a partir de fonte de energia"],
        ["D", "Ocupam sempre o ultimo nivel trofico"],
        ["E", "Nao participam do fluxo de energia"],
      ]),
      correctAlternative: "C",
      explanation:
        "Produtores, como plantas e algas, produzem materia organica por fotossintese ou quimiossintese.",
      pedagogyComment:
        "A base da ecologia e separar fluxo de energia de ciclo da materia.",
      tags: tags("ecologia", "cadeia-alimentar"),
      source: "Questao modelo EstudAki",
      status: ContentStatus.PUBLISHED,
    },
    {
      vestibularId: unicamp.id,
      subjectId: humanas.id,
      topicId: topic["brasil-republica"].id,
      year: 2020,
      difficulty: Difficulty.MEDIUM,
      statement:
        "A Politica dos Governadores, na Primeira Republica brasileira, tinha como objetivo principal:",
      alternatives: alternatives([
        ["A", "Ampliar a participacao direta dos trabalhadores urbanos"],
        ["B", "Garantir estabilidade politica por acordos entre oligarquias estaduais e governo federal"],
        ["C", "Extinguir o coronelismo nas regioes rurais"],
        ["D", "Centralizar completamente o poder no Exército"],
        ["E", "Criar voto secreto universal"],
      ]),
      correctAlternative: "B",
      explanation:
        "O pacto articulava governo federal e elites estaduais para sustentar maiorias politicas e controlar oposicoes.",
      pedagogyComment:
        "Cuidado com alternativas que usam palavras absolutas como 'extinguir' e 'completamente'.",
      tags: tags("primeira-republica", "oligarquias", "politica"),
      source: "Questao modelo EstudAki",
      status: ContentStatus.PUBLISHED,
    },
  ];

  const questions = [];
  for (const item of questionSeed) {
    const existing = await prisma.question.findFirst({
      where: { statement: item.statement },
    });
    const question = existing
      ? await prisma.question.update({ where: { id: existing.id }, data: item })
      : await prisma.question.create({ data: { ...item, authorId: teacher.id } });
    questions.push(question);
  }

  await prisma.questionAttempt.deleteMany({ where: { userId: student.id } });
  await prisma.studySession.deleteMany({});
  await prisma.userAchievement.deleteMany({});
  await prisma.achievement.deleteMany({});

  await prisma.questionAttempt.createMany({
    data: [
      {
        userId: student.id,
        questionId: questions[0].id,
        selectedAlternative: "C",
        correct: false,
        errorType: "concept_gap",
        timeSpentSeconds: 68,
      },
      {
        userId: student.id,
        questionId: questions[1].id,
        selectedAlternative: "B",
        correct: false,
        errorType: "calculation",
        timeSpentSeconds: 110,
      },
      {
        userId: student.id,
        questionId: questions[3].id,
        selectedAlternative: "B",
        correct: true,
        timeSpentSeconds: 42,
      },
      {
        userId: student.id,
        questionId: questions[4].id,
        selectedAlternative: "C",
        correct: true,
        timeSpentSeconds: 51,
      },
      {
        userId: student.id,
        questionId: questions[5].id,
        selectedAlternative: "B",
        correct: true,
        timeSpentSeconds: 73,
      },
    ],
  });

  await prisma.studySession.createMany({
    data: [
      {
        userId: student.id,
        focus: "questions",
        durationSeconds: 35 * 60,
        questionsAnswered: 5,
        correctAnswers: 3,
        notes: "Lista diagnostica de matematica e linguagens.",
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
        endedAt: new Date(Date.now() - 1000 * 60 * 60 * 3 + 35 * 60 * 1000),
      },
      {
        userId: student.id,
        focus: "review",
        durationSeconds: 18 * 60,
        questionsAnswered: 2,
        correctAnswers: 1,
        notes: "Revisao de caderno de erros.",
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 28),
        endedAt: new Date(Date.now() - 1000 * 60 * 60 * 28 + 18 * 60 * 1000),
      },
      {
        userId: teacher.id,
        focus: "content",
        durationSeconds: 42 * 60,
        questionsAnswered: 0,
        correctAnswers: 0,
        notes: "Criacao de resolucao e material.",
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
        endedAt: new Date(Date.now() - 1000 * 60 * 60 * 6 + 42 * 60 * 1000),
      },
    ],
  });

  const achievements = await prisma.achievement.createManyAndReturn({
    data: [
      {
        slug: "primeira-lista",
        title: "Primeira lista",
        description: "Responda sua primeira lista de questoes.",
        icon: "book-open-check",
        color: "#2563EB",
        xpReward: 50,
        criteriaType: "questions",
        criteriaValue: 1,
      },
      {
        slug: "caderno-em-dia",
        title: "Caderno em dia",
        description: "Revise erros pendentes e mantenha o plano limpo.",
        icon: "clipboard-check",
        color: "#F97316",
        xpReward: 80,
        criteriaType: "reviews",
        criteriaValue: 2,
      },
      {
        slug: "ritmo-de-aprovacao",
        title: "Ritmo de aprovacao",
        description: "Mantenha uma sequencia de 7 dias.",
        icon: "flame",
        color: "#FACC15",
        xpReward: 120,
        criteriaType: "streak",
        criteriaValue: 7,
      },
      {
        slug: "precisao-alta",
        title: "Precisao alta",
        description: "Alcance 70% de acerto ponderado.",
        icon: "target",
        color: "#22C55E",
        xpReward: 100,
        criteriaType: "accuracy",
        criteriaValue: 70,
      },
    ],
  });

  await prisma.userAchievement.createMany({
    data: achievements.map((achievement) => {
      const completed =
        achievement.slug === "primeira-lista" ||
        achievement.slug === "ritmo-de-aprovacao";
      return {
        userId: student.id,
        achievementId: achievement.id,
        progress:
          achievement.slug === "precisao-alta"
            ? 60
            : achievement.slug === "caderno-em-dia"
              ? 1
              : achievement.criteriaValue,
        completed,
        unlockedAt: completed ? new Date() : null,
      };
    }),
  });

  await prisma.exam.deleteMany({});

  const enemArchiveYears = Array.from({ length: 28 }, (_, index) => 2025 - index).filter(
    (year) => year >= 1998,
  );
  const etecArchiveYears = [2026, 2025, 2024, 2023, 2022, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];
  const fatecArchiveYears = [2026, 2025, 2024, 2023, 2022, 2020, 2019, 2018, 2017];
  const fuvestArchiveYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];
  const unicampArchiveYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
  const unespArchiveYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

  const examSeed = [
    {
      vestibularId: enem.id,
      title: "ENEM 2025 - Dia 1 - Caderno Azul",
      year: 2025,
      phase: "Aplicacao regular",
      day: "Dia 1",
      pdfUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_PV_impresso_D1_CD1.pdf",
      answerKeyUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_GB_impresso_D1_CD1.pdf",
      sourceUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2025",
      imageUrl: "/loop/Enem_logo.png",
      questionCount: 90,
      durationMinutes: 330,
      color: "#1E73FF",
    },
    {
      vestibularId: enem.id,
      title: "ENEM 2025 - Dia 2 - Caderno Amarelo",
      year: 2025,
      phase: "Aplicacao regular",
      day: "Dia 2",
      pdfUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_PV_impresso_D2_CD5.pdf",
      answerKeyUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_GB_impresso_D2_CD5.pdf",
      sourceUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2025",
      imageUrl: "/loop/Enem_logo.png",
      questionCount: 90,
      durationMinutes: 300,
      color: "#1E73FF",
    },
    {
      vestibularId: fuvest.id,
      title: "FUVEST 2025 - Primeira fase - V1",
      year: 2025,
      phase: "Primeira fase",
      day: "V1",
      pdfUrl: "https://www.fuvest.br/fuvest2025_primeira_fase_prova_V1.pdf",
      answerKeyUrl: "https://www.fuvest.br/wp-content/uploads/fuvest2025_gabarito_primeira_fase.pdf",
      sourceUrl: "https://www.fuvest.br/acervo-vestibular-2025/",
      imageUrl: "/loop/img-logo-fuvest-1.webp",
      questionCount: 90,
      durationMinutes: 300,
      color: "#0057B8",
    },
    {
      vestibularId: fuvest.id,
      title: "FUVEST 2025 - Segunda fase - 1o dia",
      year: 2025,
      phase: "Segunda fase",
      day: "1o dia",
      sourceUrl: "https://www.fuvest.br/acervo-vestibular-2025/",
      answerKeyUrl: "https://www.fuvest.br/wp-content/uploads/fuvest_2025_guia_respostas.pdf",
      imageUrl: "/loop/img-logo-fuvest-1.webp",
      questionCount: 10,
      durationMinutes: 240,
      color: "#0057B8",
    },
    {
      vestibularId: unicamp.id,
      title: "UNICAMP 2026 - Primeira fase - Provas Q e X",
      year: 2026,
      phase: "Primeira fase",
      day: "Q e X",
      pdfUrl: "https://www.comvest.unicamp.br/vest2026/F1/f12026Q_X.pdf",
      answerKeyUrl: "https://www.comvest.unicamp.br/wp-content/uploads/2025/10/Q_X-gabarito.pdf",
      sourceUrl: "https://www.comvest.unicamp.br/ingresso-2026/vestibular-2026/provas-e-gabaritos-vestibular-2026/",
      imageUrl: "/loop/UNICAMP_logo.svg.png",
      questionCount: 72,
      durationMinutes: 300,
      color: "#7C3AED",
    },
    {
      vestibularId: unicamp.id,
      title: "UNICAMP 2026 - Segunda fase - Ciencias Exatas/Tecnologicas",
      year: 2026,
      phase: "Segunda fase",
      day: "Dia 2 - CET",
      pdfUrl: "https://www.comvest.unicamp.br/vest2026/F2/provas/2026F2CE.pdf",
      answerKeyUrl: "https://www.comvest.unicamp.br/wp-content/uploads/2025/12/Respostas-Esperadas_Dia-2_CET.pdf",
      sourceUrl: "https://www.comvest.unicamp.br/ingresso-2026/vestibular-2026/provas-e-gabaritos-vestibular-2026/",
      imageUrl: "/loop/UNICAMP_logo.svg.png",
      durationMinutes: 300,
      color: "#7C3AED",
    },
    {
      vestibularId: unesp.id,
      title: "UNESP 2025 - Conhecimentos gerais e redacao",
      year: 2025,
      phase: "Fase unica",
      day: "Prova objetiva",
      pdfUrl: "https://documento.vunesp.com.br/documento/stream/NjUzODYzNg%3D%3D",
      answerKeyUrl: "https://documento.vunesp.com.br/documento/stream/NjU5MzIzOA%3D%3D",
      sourceUrl: "https://www.vunesp.com.br/VNSP2404/",
      imageUrl: "/loop/unesp-removebg-preview.png",
      questionCount: 90,
      durationMinutes: 300,
      color: "#00A878",
    },
    {
      vestibularId: fatec.id,
      title: "FATEC 2025 - 2o semestre",
      year: 2025,
      phase: "Unica fase",
      day: "2o semestre",
      pdfUrl: "https://fatweb.s3.amazonaws.com/vestibularfatec/gabarito/202528719/Prova.pdf?v=2.1",
      answerKeyUrl: "https://fatweb.s3.amazonaws.com/vestibularfatec/gabarito/202528719/Gabarito.pdf?v=2.1",
      sourceUrl: "https://vestibular.fatec.sp.gov.br/provas-gabaritos/detalhe.asp?q=2025",
      imageUrl: "/loop/fatec-identidade-removebg-preview.png",
      questionCount: 64,
      durationMinutes: 300,
      color: "#EF4444",
    },
    {
      vestibularId: etec.id,
      title: "ETEC 2025 - 2o semestre",
      year: 2025,
      phase: "Vestibulinho",
      day: "2o semestre",
      pdfUrl: "https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/1/2025/07/vestibulinho-2025-2sem-prova.pdf",
      answerKeyUrl: "https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/1/2025/07/vestibulinho-2025-2sem-gabarito.pdf",
      sourceUrl: "https://www.cps.sp.gov.br/etec/vestibulinho/",
      imageUrl: "/loop/etec.png",
      questionCount: 50,
      durationMinutes: 240,
      color: "#F59E0B",
    },
    {
      vestibularId: enem.id,
      title: "ENEM 2024 - Dia 1 - Caderno Azul",
      year: 2024,
      phase: "Aplicacao regular",
      day: "Dia 1",
      pdfUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D1_CD1.pdf",
      answerKeyUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D1_CD1.pdf",
      sourceUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2024",
      imageUrl: "/loop/Enem_logo.png",
      questionCount: 90,
      durationMinutes: 330,
      color: "#1E73FF",
    },
    {
      vestibularId: enem.id,
      title: "ENEM 2024 - Dia 2 - Caderno Amarelo",
      year: 2024,
      phase: "Aplicacao regular",
      day: "Dia 2",
      pdfUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D2_CD5.pdf",
      answerKeyUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D2_CD5.pdf",
      sourceUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2024",
      imageUrl: "/loop/Enem_logo.png",
      questionCount: 90,
      durationMinutes: 300,
      color: "#1E73FF",
    },
    {
      vestibularId: enem.id,
      title: "ENEM 2023 - Dia 1 - Caderno Azul",
      year: 2023,
      phase: "Aplicacao regular",
      day: "Dia 1",
      pdfUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2023_PV_impresso_D1_CD1.pdf",
      answerKeyUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2023_GB_impresso_D1_CD1.pdf",
      sourceUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2023",
      imageUrl: "/loop/Enem_logo.png",
      questionCount: 90,
      durationMinutes: 330,
      color: "#1E73FF",
    },
    {
      vestibularId: enem.id,
      title: "ENEM 2023 - Dia 2 - Caderno Amarelo",
      year: 2023,
      phase: "Aplicacao regular",
      day: "Dia 2",
      pdfUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2023_PV_impresso_D2_CD5.pdf",
      answerKeyUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2023_GB_impresso_D2_CD5.pdf",
      sourceUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2023",
      imageUrl: "/loop/Enem_logo.png",
      questionCount: 90,
      durationMinutes: 300,
      color: "#1E73FF",
    },
    {
      vestibularId: enem.id,
      title: "ENEM 2022 - Dia 1 - Caderno Azul",
      year: 2022,
      phase: "Aplicacao regular",
      day: "Dia 1",
      pdfUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2022_PV_impresso_D1_CD1.pdf",
      answerKeyUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2022_GB_impresso_D1_CD1.pdf",
      sourceUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2022",
      imageUrl: "/loop/Enem_logo.png",
      questionCount: 90,
      durationMinutes: 330,
      color: "#1E73FF",
    },
    {
      vestibularId: enem.id,
      title: "ENEM 2022 - Dia 2 - Caderno Amarelo",
      year: 2022,
      phase: "Aplicacao regular",
      day: "Dia 2",
      pdfUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2022_PV_impresso_D2_CD5.pdf",
      answerKeyUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2022_GB_impresso_D2_CD5.pdf",
      sourceUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2022",
      imageUrl: "/loop/Enem_logo.png",
      questionCount: 90,
      durationMinutes: 300,
      color: "#1E73FF",
    },
    {
      vestibularId: enem.id,
      title: "ENEM 2021 - Dia 1 - Caderno Azul",
      year: 2021,
      phase: "Aplicacao regular",
      day: "Dia 1",
      pdfUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2021_PV_impresso_D1_CD1.pdf",
      answerKeyUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2021_GB_impresso_D1_CD1.pdf",
      sourceUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2021",
      imageUrl: "/loop/Enem_logo.png",
      questionCount: 90,
      durationMinutes: 330,
      color: "#1E73FF",
    },
    {
      vestibularId: enem.id,
      title: "ENEM 2021 - Dia 2 - Caderno Amarelo",
      year: 2021,
      phase: "Aplicacao regular",
      day: "Dia 2",
      pdfUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2021_PV_impresso_D2_CD5.pdf",
      answerKeyUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/2021_GB_impresso_D2_CD5.pdf",
      sourceUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2021",
      imageUrl: "/loop/Enem_logo.png",
      questionCount: 90,
      durationMinutes: 300,
      color: "#1E73FF",
    },
    {
      vestibularId: fatec.id,
      title: "FATEC 2026 - 1o semestre",
      year: 2026,
      phase: "Unica fase",
      day: "1o semestre",
      pdfUrl: "https://fatweb.s3.amazonaws.com/vestibularfatec/gabarito/202619102/Prova.pdf?v=2.1",
      answerKeyUrl: "https://fatweb.s3.amazonaws.com/vestibularfatec/gabarito/202619102/Gabarito.pdf?v=2.1",
      sourceUrl: "https://vestibular.fatec.sp.gov.br/provas-gabaritos/detalhe.asp?q=2026",
      imageUrl: "/loop/fatec-identidade-removebg-preview.png",
      questionCount: 60,
      durationMinutes: 300,
      color: "#EF4444",
    },
    {
      vestibularId: etec.id,
      title: "ETEC 2026 - 1o semestre",
      year: 2026,
      phase: "Vestibulinho",
      day: "1o semestre",
      pdfUrl: "https://fatweb.s3.amazonaws.com/vestibulinhoetec/gabarito/20261176943/A-CADERNO-VESTIBULINHO-1SEM2026.pdf",
      sourceUrl: "https://vestibulinho.etec.sp.gov.br/provas-gabaritos/2026-1sem.asp?m=3",
      imageUrl: "/loop/etec.png",
      questionCount: 50,
      durationMinutes: 240,
      color: "#F59E0B",
    },
    {
      vestibularId: etec.id,
      title: "ETEC 2025 - 1o semestre",
      year: 2025,
      phase: "Vestibulinho",
      day: "1o semestre",
      pdfUrl: "https://fatweb.s3.amazonaws.com/vestibulinhoetec/gabarito/20251468190/Prova.pdf",
      answerKeyUrl: "https://fatweb.s3.amazonaws.com/vestibulinhoetec/gabarito/20251468190/Gabarito.pdf",
      sourceUrl: "https://vestibulinho.etec.sp.gov.br/provas-gabaritos/detalhe.asp?q=2025",
      imageUrl: "/loop/etec.png",
      questionCount: 50,
      durationMinutes: 240,
      color: "#F59E0B",
    },
    ...enemArchiveYears
      .filter((year) => year !== 2025)
      .map((year) => ({
        vestibularId: enem.id,
        title: `ENEM ${year} - acervo oficial Inep`,
        year,
        phase: "Acervo completo",
        day: "Provas e gabaritos",
        sourceUrl: `https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/${year}`,
        imageUrl: "/loop/Enem_logo.png",
        questionCount: year >= 2009 ? 180 : 63,
        durationMinutes: year >= 2009 ? 630 : 240,
        color: "#1E73FF",
      })),
    ...fuvestArchiveYears
      .filter((year) => year !== 2025)
      .map((year) => ({
        vestibularId: fuvest.id,
        title: `FUVEST ${year} - acervo oficial`,
        year,
        phase: "Acervo completo",
        day: "Fase 1 e fase 2",
        sourceUrl: `https://www.fuvest.br/acervo-vestibular-${year}/`,
        imageUrl: "/loop/img-logo-fuvest-1.webp",
        color: "#0057B8",
      })),
    ...unicampArchiveYears
      .filter((year) => year !== 2026)
      .map((year) => ({
        vestibularId: unicamp.id,
        title: `UNICAMP ${year} - acervo Comvest`,
        year,
        phase: "Acervo completo",
        day: "Fase 1 e fase 2",
        sourceUrl: `https://www.comvest.unicamp.br/ingresso-${year}/vestibular-${year}/provas-e-gabaritos-vestibular-${year}/`,
        imageUrl: "/loop/UNICAMP_logo.svg.png",
        color: "#7C3AED",
      })),
    ...unespArchiveYears
      .filter((year) => year !== 2025)
      .map((year) => ({
        vestibularId: unesp.id,
        title: `UNESP ${year} - acervo Vunesp`,
        year,
        phase: "Acervo completo",
        day: "Provas e gabaritos",
        sourceUrl: year === 2026 ? "https://www.vunesp.com.br/VNSP2504/" : "https://www.vunesp.com.br/",
        imageUrl: "/loop/unesp-removebg-preview.png",
        color: "#00A878",
      })),
    ...fatecArchiveYears
      .filter((year) => year !== 2025)
      .map((year) => ({
        vestibularId: fatec.id,
        title: `FATEC ${year} - provas e gabaritos`,
        year,
        phase: "Acervo oficial",
        day: "Semestres",
        sourceUrl: `https://vestibular.fatec.sp.gov.br/provas-gabaritos/detalhe.asp?q=${year}`,
        imageUrl: "/loop/fatec-identidade-removebg-preview.png",
        color: "#EF4444",
      })),
    ...etecArchiveYears
      .filter((year) => year !== 2025)
      .map((year) => ({
        vestibularId: etec.id,
        title: `ETEC ${year} - provas e gabaritos`,
        year,
        phase: "Acervo oficial",
        day: "Semestres",
        sourceUrl: "https://www.cps.sp.gov.br/etec/vestibulinho/",
        imageUrl: "/loop/etec.png",
        color: "#F59E0B",
      })),
  ];

  await prisma.exam.createMany({
    data: examSeed.map((exam) => ({
      ...exam,
      official: true,
      status: ContentStatus.PUBLISHED,
    })),
  });

  await Promise.all(
    [
      {
        title: "Mapa mental de Geometria Plana",
        type: MaterialType.MINDMAP,
        category: "Mapas mentais",
        description: "Perimetro, area, semelhanca e angulos com gatilhos rapidos de prova.",
        subjectId: matematica.id,
        topicId: topic["geometria-plana"].id,
        premium: false,
        priceCents: 0,
        purchaseUrl: null,
      },
      {
        title: "Checklist ENEM: Interpretacao",
        type: MaterialType.PDF,
        category: "Resumos",
        description: "Roteiro para identificar tese, argumento, funcao social e inferencia.",
        subjectId: linguagens.id,
        topicId: topic["interpretacao-texto"].id,
        premium: false,
        priceCents: 0,
        purchaseUrl: null,
      },
      {
        title: "Apostila de Redacao Nota Alta",
        type: MaterialType.PDF,
        category: "Apostilas",
        description: "Estrutura, repertorio, competencias e modelos de intervencao.",
        subjectId: redacao.id,
        topicId: topic["competencia-3"].id,
        premium: true,
        priceCents: 2990,
        purchaseUrl: "https://pay.hotmart.com/",
      },
    ].map(async (material) => {
      const existing = await prisma.material.findFirst({ where: { title: material.title } });
      return existing
        ? prisma.material.update({ where: { id: existing.id }, data: material })
        : prisma.material.create({ data: material });
    }),
  );

  await Promise.all(
    [
      {
        title: "Geometria Plana em 2 minutos",
        description: "Como diferenciar area e perimetro sem cair em pegadinha.",
        kind: VideoKind.EXPRESS,
        durationSeconds: 122,
        subjectId: matematica.id,
        topicId: topic["geometria-plana"].id,
        questionId: questions[0].id,
      },
      {
        title: "Porcentagem pelo multiplicador",
        description: "Um atalho seguro para aumento, desconto e comparacao percentual.",
        kind: VideoKind.RESOLUTION,
        durationSeconds: 188,
        subjectId: matematica.id,
        topicId: topic["porcentagem"].id,
        questionId: questions[1].id,
      },
      {
        title: "Como ler alternativas do ENEM",
        description: "Tecnica rapida para cortar alternativas absolutas e confusas.",
        kind: VideoKind.EXPRESS,
        durationSeconds: 95,
        subjectId: linguagens.id,
        topicId: topic["interpretacao-texto"].id,
      },
    ].map(async (video) => {
      const existing = await prisma.video.findFirst({ where: { title: video.title } });
      return existing
        ? prisma.video.update({ where: { id: existing.id }, data: { ...video, authorId: teacher.id } })
        : prisma.video.create({ data: { ...video, authorId: teacher.id } });
    }),
  );

  await prisma.flashcard.deleteMany({});
  await prisma.flashcard.createMany({
    data: [
      {
        subjectId: matematica.id,
        topicId: topic["geometria-plana"].id,
        front: "Quando uma questao pede cercar, contornar ou moldura, ela costuma cobrar o que?",
        back: "Perimetro. Some os lados ou use a formula da figura.",
      },
      {
        subjectId: matematica.id,
        topicId: topic["porcentagem"].id,
        front: "Qual multiplicador representa aumento de 15%?",
        back: "1,15. O valor final e o inicial multiplicado por 1,15.",
      },
      {
        subjectId: humanas.id,
        topicId: topic["brasil-republica"].id,
        front: "O que sustentava a Politica dos Governadores?",
        back: "Acordos entre governo federal e oligarquias estaduais para manter estabilidade politica.",
      },
    ],
  });

  await prisma.simulado.deleteMany({});
  await prisma.simulado.create({
    data: {
      vestibularId: enem.id,
      title: "Simulado Inteligente ENEM - Diagnostico",
      description: "Lista curta para detectar pontos fracos e gerar recomendacoes.",
      durationMin: 45,
      questionIds: JSON.stringify(questions.map((question) => question.id)),
    },
  });

  await prisma.challenge.deleteMany({});
  await prisma.challenge.createMany({
    data: [
      {
        title: "Semana da Geometria",
        description: "Resolva 30 questoes de Geometria e revise seus erros.",
        rewardXp: 500,
        goal: 30,
        metric: "questions",
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
      {
        title: "Sprint de Revisao",
        description: "Revise 15 erros do caderno para subir seu score de estudo.",
        rewardXp: 350,
        goal: 15,
        metric: "reviews",
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      },
    ],
  });

  await prisma.activity.deleteMany({});
  await prisma.activity.createMany({
    data: [
      {
        userId: student.id,
        type: ActivityType.STREAK,
        message: "Guilherme atingiu 7 dias de sequencia.",
        xp: 120,
      },
      {
        userId: teacher.id,
        type: ActivityType.CONTENT,
        message: "Prof. Pedro publicou uma resolucao de Porcentagem.",
        xp: 0,
      },
      {
        userId: admin.id,
        type: ActivityType.CHALLENGE,
        message: "Novo desafio Semana da Geometria esta disponivel.",
        xp: 500,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
