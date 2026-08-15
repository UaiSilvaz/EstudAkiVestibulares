import { loadEnvConfig } from "@next/env";
import {
  OfficialFileType,
  OfficialSourceKind,
  OfficialSourceStatus,
  PrismaClient,
} from "@prisma/client";

loadEnvConfig(process.cwd());

const db = new PrismaClient();

type Seed = {
  vestibular: string;
  year?: number;
  url: string;
  notes: string;
};

const seeds: Seed[] = [
  {
    vestibular: "ENEM",
    url: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos",
    notes: "Índice oficial do INEP para provas e gabaritos do ENEM.",
  },
  ...Array.from({ length: 11 }, (_, index) => 2025 - index).map((year) => ({
    vestibular: "ENEM",
    year,
    url: `https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/${year}`,
    notes: `Página oficial do ENEM ${year}.`,
  })),
  {
    vestibular: "ETEC",
    url: "https://vestibulinho.etec.sp.gov.br/provas-gabaritos/",
    notes: "Índice oficial ETEC. O ano de 2021 não consta no índice aprovado.",
  },
  ...[2025, 2024, 2023, 2022, 2020, 2019, 2018, 2017].map((year) => ({
    vestibular: "ETEC",
    year,
    url: `https://vestibulinho.etec.sp.gov.br/provas-gabaritos/detalhe.asp?q=${year}`,
    notes: `Página oficial de provas e gabaritos ETEC ${year}.`,
  })),
  {
    vestibular: "FATEC",
    url: "https://vestibular.fatec.sp.gov.br/provas-gabaritos/",
    notes: "Índice oficial FATEC. O ano de 2021 não consta no índice aprovado.",
  },
  ...[2025, 2024, 2023, 2022, 2020, 2019, 2018, 2017].map((year) => ({
    vestibular: "FATEC",
    year,
    url: `https://vestibular.fatec.sp.gov.br/provas-gabaritos/detalhe.asp?q=${year}`,
    notes: `Página oficial de provas e gabaritos FATEC ${year}.`,
  })),
  {
    vestibular: "FUVEST",
    url: "https://www.fuvest.br/acervo-vestibular/",
    notes: "Acervo oficial da FUVEST.",
  },
  ...[2025, 2024, 2023, 2022, 2021, 2020].map((year) => ({
    vestibular: "FUVEST",
    year,
    url: `https://www.fuvest.br/acervo-vestibular-${year}/`,
    notes: `Acervo oficial FUVEST ${year}.`,
  })),
  {
    vestibular: "PROVAO_PAULISTA",
    url: "https://provaopaulistaseriado.vunesp.com.br/",
    notes: "Página oficial do Provão Paulista Seriado.",
  },
  { vestibular: "PROVAO_PAULISTA", year: 2025, url: "https://www.vunesp.com.br/SEED2503", notes: "Página oficial Vunesp do Provão Paulista 2025." },
  { vestibular: "PROVAO_PAULISTA", year: 2024, url: "https://www.vunesp.com.br/SEED2405", notes: "Página oficial Vunesp do Provão Paulista 2024." },
  { vestibular: "PROVAO_PAULISTA", year: 2023, url: "https://www.vunesp.com.br/SEED2303", notes: "Página oficial Vunesp do Provão Paulista 2023." },
  {
    vestibular: "UNESP",
    url: "https://vestibular.unesp.br/",
    notes: "Arquivo oficial UNESP; 2017 e 2018 exigem validação manual antes de qualquer download.",
  },
  { vestibular: "UNESP", year: 2025, url: "https://www.vunesp.com.br/VNSP2404/", notes: "UNESP 2025 regular." },
  { vestibular: "UNESP", year: 2025, url: "https://www.vunesp.com.br/VNSP2408/", notes: "UNESP 2025 meio de ano." },
  { vestibular: "UNESP", year: 2024, url: "https://www.vunesp.com.br/VNSP2303/", notes: "UNESP 2024 regular." },
  { vestibular: "UNESP", year: 2024, url: "https://www.vunesp.com.br/VNSP2305/", notes: "UNESP 2024 meio de ano." },
  { vestibular: "UNESP", year: 2023, url: "https://www.vunesp.com.br/VNSP2206/", notes: "UNESP 2023 regular." },
  { vestibular: "UNESP", year: 2022, url: "https://www.vunesp.com.br/VNSP2105/", notes: "UNESP 2022 regular." },
  {
    vestibular: "UNICAMP",
    url: "https://www.comvest.unicamp.br/vestibulares-anteriores/",
    notes: "Índice oficial de vestibulares anteriores da COMVEST.",
  },
  ...[
    [2025, "https://www.comvest.unicamp.br/ingresso-2025/"],
    [2024, "https://www.comvest.unicamp.br/ingresso-2024/"],
    [2023, "https://www.comvest.unicamp.br/ingresso-2023/"],
    [2022, "https://www.comvest.unicamp.br/ingresso-2022/"],
    [2021, "https://www.comvest.unicamp.br/ingresso-2021-comvest/"],
    [2020, "https://www.comvest.unicamp.br/vestibulares-anteriores/ingresso-2020/"],
    [2019, "https://www.comvest.unicamp.br/vestibulares-anteriores/ingresso-2019/"],
    [2018, "https://www.comvest.unicamp.br/vestibulares-anteriores/vestibular-2018/"],
    [2017, "https://www.comvest.unicamp.br/vestibulares-anteriores/vestibular-2017/"],
  ].map(([year, url]) => ({
    vestibular: "UNICAMP",
    year: Number(year),
    url: String(url),
    notes: `Página oficial COMVEST ${year}.`,
  })),
];

async function main() {
  let created = 0;
  let updated = 0;
  for (const seed of seeds) {
    const existing = await db.officialSource.findUnique({ where: { sourceUrl: seed.url } });
    await db.officialSource.upsert({
      where: { sourceUrl: seed.url },
      update: {
        vestibular: seed.vestibular,
        year: seed.year ?? null,
        notes: seed.notes,
        status: OfficialSourceStatus.APPROVED,
        approvedAt: existing?.approvedAt ?? new Date(),
      },
      create: {
        vestibular: seed.vestibular,
        year: seed.year ?? null,
        edition: "regular",
        fileType: OfficialFileType.INDEX_PAGE,
        sourceKind: OfficialSourceKind.SEED_PAGE,
        sourceUrl: seed.url,
        sourceDomain: new URL(seed.url).hostname.toLowerCase(),
        status: OfficialSourceStatus.APPROVED,
        approvedAt: new Date(),
        notes: seed.notes,
      },
    });
    if (existing) updated += 1;
    else created += 1;
  }
  await db.officialImportLog.create({
    data: {
      action: "seed_approved_sources",
      status: "SUCCESS",
      message: `${created} fonte(s) criada(s) e ${updated} atualizada(s). Nenhum arquivo foi baixado.`,
      metadata: JSON.stringify({ total: seeds.length }),
    },
  });
  console.log(JSON.stringify({ total: seeds.length, created, updated, downloads: 0 }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
