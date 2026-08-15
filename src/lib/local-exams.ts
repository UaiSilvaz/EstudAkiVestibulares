type LocalVestibular = {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string;
};

type LocalExamInput = {
  slug: string;
  title: string;
  year: number;
  phase: string;
  day: string;
  pdfUrl?: string | null;
  answerKeyUrl?: string | null;
  sourceUrl: string;
  imageUrl: string;
  questionCount?: number | null;
  durationMinutes?: number | null;
  color?: string;
};

export const localVestibulares: LocalVestibular[] = [
  { id: "local-enem", name: "ENEM", slug: "enem", color: "#1E73FF", description: "Acervo local ENEM" },
  { id: "local-etec", name: "ETEC", slug: "etec", color: "#F59E0B", description: "Acervo local ETEC" },
  { id: "local-fatec", name: "FATEC", slug: "fatec", color: "#EF4444", description: "Acervo local FATEC" },
  { id: "local-fuvest", name: "FUVEST", slug: "fuvest", color: "#0057B8", description: "Acervo local FUVEST" },
  { id: "local-unicamp", name: "UNICAMP", slug: "unicamp", color: "#7C3AED", description: "Acervo local UNICAMP" },
  { id: "local-unesp", name: "UNESP", slug: "unesp", color: "#00A878", description: "Acervo local UNESP" },
  { id: "local-provao-paulista", name: "Provão Paulista", slug: "provao-paulista", color: "#7C3AED", description: "Banco de questões do Provão Paulista" },
];

const officialYears = {
  enem: range(2009, 2025),
  etec: [2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025, 2026],
  fatec: [2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025, 2026],
  fuvest: range(2009, 2026),
  unicamp: range(2017, 2026),
  unesp: range(2017, 2026),
  "provao-paulista": [2023, 2024, 2025, 2026],
};

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function vestibular(slug: string) {
  return localVestibulares.find((item) => item.slug === slug) ?? localVestibulares[0];
}

function createExam(input: LocalExamInput) {
  const item = vestibular(input.slug);
  const id = `local-${input.slug}-${input.year}-${input.day
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()}`;

  return {
    id,
    title: input.title,
    year: input.year,
    phase: input.phase,
    day: input.day,
    pdfUrl: input.pdfUrl ?? null,
    answerKeyUrl: input.answerKeyUrl ?? null,
    sourceUrl: input.sourceUrl,
    imageUrl: input.imageUrl,
    questionCount: input.questionCount ?? null,
    durationMinutes: input.durationMinutes ?? null,
    official: true,
    color: input.color ?? item.color,
    status: "PUBLISHED",
    createdAt: new Date(),
    updatedAt: new Date(),
    vestibularId: item.id,
    vestibular: item,
  };
}

function enemExams() {
  return officialYears.enem.flatMap((year) => {
    const sourceUrl = `https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/${year}`;

    return [
      createExam({
        slug: "enem",
        title: `ENEM ${year} - Dia 1 - Caderno Azul`,
        year,
        phase: "Aplicacao regular",
        day: "Dia 1",
        pdfUrl: `https://download.inep.gov.br/enem/provas_e_gabaritos/${year}_PV_impresso_D1_CD1.pdf`,
        answerKeyUrl: `https://download.inep.gov.br/enem/provas_e_gabaritos/${year}_GB_impresso_D1_CD1.pdf`,
        sourceUrl,
        imageUrl: "/loop/Enem_logo.png",
        questionCount: 90,
        durationMinutes: 330,
        color: "#1E73FF",
      }),
      createExam({
        slug: "enem",
        title: `ENEM ${year} - Dia 2 - Caderno Amarelo`,
        year,
        phase: "Aplicacao regular",
        day: "Dia 2",
        pdfUrl: `https://download.inep.gov.br/enem/provas_e_gabaritos/${year}_PV_impresso_D2_CD5.pdf`,
        answerKeyUrl: `https://download.inep.gov.br/enem/provas_e_gabaritos/${year}_GB_impresso_D2_CD5.pdf`,
        sourceUrl,
        imageUrl: "/loop/Enem_logo.png",
        questionCount: 90,
        durationMinutes: 300,
        color: "#1E73FF",
      }),
    ];
  });
}

function etecExams() {
  return officialYears.etec.flatMap((year) => {
    const sourceUrl =
      year === 2026
        ? "https://vestibulinho.etec.sp.gov.br/provas-gabaritos/2026-1sem.asp?m=3"
        : `https://vestibulinho.etec.sp.gov.br/provas-gabaritos/detalhe.asp?q=${year}`;

    const direct: Record<number, Array<Pick<LocalExamInput, "day" | "pdfUrl" | "answerKeyUrl">>> = {
      2026: [
        {
          day: "1o semestre",
          pdfUrl: "https://fatweb.s3.amazonaws.com/vestibulinhoetec/gabarito/20261176943/A-CADERNO-VESTIBULINHO-1SEM2026.pdf",
          answerKeyUrl: null,
        },
      ],
      2025: [
        {
          day: "1o semestre",
          pdfUrl: "https://fatweb.s3.amazonaws.com/vestibulinhoetec/gabarito/20251468190/Prova.pdf",
          answerKeyUrl: "https://fatweb.s3.amazonaws.com/vestibulinhoetec/gabarito/20251468190/Gabarito.pdf",
        },
      ],
    };

    return (direct[year] ?? [{ day: "1o semestre" }, { day: "2o semestre" }]).map((item) =>
      createExam({
        slug: "etec",
        title: `ETEC ${year} - ${item.day}`,
        year,
        phase: "Vestibulinho",
        day: item.day,
        pdfUrl: item.pdfUrl ?? null,
        answerKeyUrl: item.answerKeyUrl ?? null,
        sourceUrl,
        imageUrl: "/loop/etec.png",
        questionCount: 50,
        durationMinutes: 240,
        color: "#F59E0B",
      }),
    );
  });
}

function fatecExams() {
  return officialYears.fatec.flatMap((year) => {
    const sourceUrl = `https://vestibular.fatec.sp.gov.br/provas-gabaritos/detalhe.asp?q=${year}`;
    const direct: Record<number, Array<Pick<LocalExamInput, "day" | "pdfUrl" | "answerKeyUrl">>> = {
      2026: [
        {
          day: "1o semestre",
          pdfUrl: "https://fatweb.s3.amazonaws.com/vestibularfatec/gabarito/202619102/Prova.pdf?v=2.1",
          answerKeyUrl: "https://fatweb.s3.amazonaws.com/vestibularfatec/gabarito/202619102/Gabarito.pdf?v=2.1",
        },
      ],
      2025: [
        {
          day: "2o semestre",
          pdfUrl: "https://fatweb.s3.amazonaws.com/vestibularfatec/gabarito/202528719/Prova.pdf?v=2.1",
          answerKeyUrl: "https://fatweb.s3.amazonaws.com/vestibularfatec/gabarito/202528719/Gabarito.pdf?v=2.1",
        },
      ],
    };

    return (direct[year] ?? [{ day: "1o semestre" }, { day: "2o semestre" }]).map((item) =>
      createExam({
        slug: "fatec",
        title: `FATEC ${year} - ${item.day}`,
        year,
        phase: "Unica fase",
        day: item.day,
        pdfUrl: item.pdfUrl ?? null,
        answerKeyUrl: item.answerKeyUrl ?? null,
        sourceUrl,
        imageUrl: "/loop/fatec-identidade-removebg-preview.png",
        questionCount: 60,
        durationMinutes: 300,
        color: "#EF4444",
      }),
    );
  });
}

function fuvestExams() {
  return officialYears.fuvest.flatMap((year) => {
    const sourceUrl = `https://www.fuvest.br/acervo-vestibular-${year}/`;
    const base = [
      { day: "Primeira fase", questionCount: 90, durationMinutes: 300 },
      { day: "Segunda fase - 1o dia", questionCount: 10, durationMinutes: 240 },
      { day: "Segunda fase - 2o dia", questionCount: 12, durationMinutes: 240 },
    ];

    return base.map((item) =>
      createExam({
        slug: "fuvest",
        title: `FUVEST ${year} - ${item.day}`,
        year,
        phase: item.day.startsWith("Primeira") ? "Primeira fase" : "Segunda fase",
        day: item.day,
        sourceUrl,
        imageUrl: "/loop/img-logo-fuvest-1.webp",
        questionCount: item.questionCount,
        durationMinutes: item.durationMinutes,
        color: "#0057B8",
      }),
    );
  });
}

function unicampExams() {
  return officialYears.unicamp.flatMap((year) => {
    const sourceUrl = `https://www.comvest.unicamp.br/ingresso-${year}/vestibular-${year}/provas-e-gabaritos-vestibular-${year}/`;
    return [
      createExam({
        slug: "unicamp",
        title: `UNICAMP ${year} - Primeira fase`,
        year,
        phase: "Primeira fase",
        day: "Dia unico",
        sourceUrl,
        imageUrl: "/loop/UNICAMP_logo.svg.png",
        questionCount: 72,
        durationMinutes: 300,
        color: "#7C3AED",
      }),
      createExam({
        slug: "unicamp",
        title: `UNICAMP ${year} - Segunda fase - Dia 1`,
        year,
        phase: "Segunda fase",
        day: "Dia 1",
        sourceUrl,
        imageUrl: "/loop/UNICAMP_logo.svg.png",
        durationMinutes: 300,
        color: "#7C3AED",
      }),
      createExam({
        slug: "unicamp",
        title: `UNICAMP ${year} - Segunda fase - Dia 2`,
        year,
        phase: "Segunda fase",
        day: "Dia 2",
        sourceUrl,
        imageUrl: "/loop/UNICAMP_logo.svg.png",
        durationMinutes: 300,
        color: "#7C3AED",
      }),
    ];
  });
}

function unespExams() {
  return officialYears.unesp.flatMap((year) => {
    const sourceUrl = year >= 2025 ? "https://www.vunesp.com.br/VNSP2404/" : "https://www.vunesp.com.br/";
    return [
      createExam({
        slug: "unesp",
        title: `UNESP ${year} - Primeira fase`,
        year,
        phase: "Primeira fase",
        day: "Conhecimentos gerais",
        sourceUrl,
        imageUrl: "/loop/unesp-removebg-preview.png",
        questionCount: 90,
        durationMinutes: 300,
        color: "#00A878",
      }),
      createExam({
        slug: "unesp",
        title: `UNESP ${year} - Segunda fase - Dia 1`,
        year,
        phase: "Segunda fase",
        day: "Dia 1",
        sourceUrl,
        imageUrl: "/loop/unesp-removebg-preview.png",
        durationMinutes: 300,
        color: "#00A878",
      }),
      createExam({
        slug: "unesp",
        title: `UNESP ${year} - Segunda fase - Dia 2`,
        year,
        phase: "Segunda fase",
        day: "Dia 2",
        sourceUrl,
        imageUrl: "/loop/unesp-removebg-preview.png",
        durationMinutes: 300,
        color: "#00A878",
      }),
    ];
  });
}

export const localExams = [
  ...enemExams(),
  ...etecExams(),
  ...fatecExams(),
  ...fuvestExams(),
  ...unicampExams(),
  ...unespExams(),
].sort((a, b) => a.year - b.year || a.vestibular.name.localeCompare(b.vestibular.name) || a.title.localeCompare(b.title));
