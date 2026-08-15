import { promises as fs } from "node:fs";
import path from "node:path";

type SourceKind = "oficial" | "web_publica" | "licenciavel" | "recusada";

type Source = {
  vestibular: string;
  fonte_nome: string;
  fonte_url: string;
  tipo_fonte: SourceKind;
  motivo: string;
  pode_importar: boolean;
  observacoes: string;
  quantidade_estimada: number;
  verify?: boolean;
};

const sources: Source[] = [
  {
    vestibular: "ENEM",
    fonte_nome: "INEP — Provas e gabaritos",
    fonte_url: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos",
    tipo_fonte: "oficial",
    motivo: "Acervo mantido pelo órgão responsável pelo ENEM.",
    pode_importar: true,
    observacoes: "Usar apenas uma cor de caderno por aplicação para evitar duplicidade e sempre parear prova e gabarito.",
    quantidade_estimada: 3060,
    verify: true,
  },
  {
    vestibular: "ETEC",
    fonte_nome: "Centro Paula Souza — Vestibulinho ETEC",
    fonte_url: "https://vestibulinho.etec.sp.gov.br/provas-gabaritos/",
    tipo_fonte: "oficial",
    motivo: "Portal oficial de provas e gabaritos do Vestibulinho ETEC.",
    pode_importar: false,
    observacoes: "A automação recebe bloqueio HTTP 403. Confirmar e baixar manualmente, sem contornar a proteção.",
    quantidade_estimada: 900,
    verify: true,
  },
  {
    vestibular: "FATEC",
    fonte_nome: "Centro Paula Souza — Vestibular FATEC",
    fonte_url: "https://vestibular.fatec.sp.gov.br/provas-gabaritos/",
    tipo_fonte: "oficial",
    motivo: "Portal oficial de provas e gabaritos do Vestibular FATEC.",
    pode_importar: false,
    observacoes: "A automação recebe bloqueio HTTP 403. Confirmar e baixar manualmente, sem contornar a proteção.",
    quantidade_estimada: 900,
    verify: true,
  },
  {
    vestibular: "FUVEST",
    fonte_nome: "FUVEST — Acervo de vestibulares",
    fonte_url: "https://www.fuvest.br/acervo-vestibular/",
    tipo_fonte: "oficial",
    motivo: "Acervo da própria FUVEST com provas e gabaritos.",
    pode_importar: true,
    observacoes: "Priorizar a primeira fase objetiva e não tratar respostas discursivas como gabarito de múltipla escolha.",
    quantidade_estimada: 1800,
    verify: true,
  },
  {
    vestibular: "UNESP",
    fonte_nome: "VUNESP/UNESP — Arquivo do vestibular",
    fonte_url: "https://vestibular.unesp.br/",
    tipo_fonte: "oficial",
    motivo: "Portal oficial do vestibular UNESP.",
    pode_importar: false,
    observacoes: "O arquivo é carregado por aplicação dinâmica; os PDFs precisam ser confirmados manualmente.",
    quantidade_estimada: 1440,
    verify: true,
  },
  {
    vestibular: "UNICAMP",
    fonte_nome: "Comvest — Vestibulares anteriores",
    fonte_url: "https://www.comvest.unicamp.br/vestibulares-anteriores/",
    tipo_fonte: "oficial",
    motivo: "Acervo oficial da comissão responsável pelo vestibular UNICAMP.",
    pode_importar: true,
    observacoes: "Selecionar uma versão de cada prova objetiva para evitar repetir as mesmas questões em ordens diferentes.",
    quantidade_estimada: 1440,
    verify: true,
  },
  {
    vestibular: "Provão Paulista",
    fonte_nome: "FUVEST — Acervo Provão Paulista",
    fonte_url: "https://www.fuvest.br/acervo-provao-paulista/",
    tipo_fonte: "oficial",
    motivo: "Página institucional relacionada ao processo do Provão Paulista.",
    pode_importar: false,
    observacoes: "Não foi confirmado um acervo completo e estável de cadernos com gabaritos; requer conferência humana.",
    quantidade_estimada: 0,
    verify: true,
  },
  {
    vestibular: "Todos",
    fonte_nome: "Qconcursos",
    fonte_url: "https://www.qconcursos.com/",
    tipo_fonte: "recusada",
    motivo: "Banco comercial/privado expressamente excluído do escopo.",
    pode_importar: false,
    observacoes: "Não acessar, extrair ou copiar questões.",
    quantidade_estimada: 0,
  },
  {
    vestibular: "Todos",
    fonte_nome: "Plataformas comerciais de cursinhos",
    fonte_url: "https://example.invalid/fontes-comerciais-bloqueadas",
    tipo_fonte: "recusada",
    motivo: "Estuda.com, Descomplica, Stoodi, Beduka, Aprova Total, Estratégia e Gran não são fontes autorizadas.",
    pode_importar: false,
    observacoes: "Lista de bloqueio preventivo; nenhuma coleta é executada.",
    quantidade_estimada: 0,
  },
];

async function verifySource(source: Source) {
  if (!source.verify) return { ...source, http_status: null, verificado_em: null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(source.fonte_url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "EstudAkiSourceAudit/1.0 (manual-review-pipeline)" },
    });
    return { ...source, http_status: response.status, verificado_em: new Date().toISOString() };
  } catch (error) {
    return {
      ...source,
      http_status: null,
      verificado_em: new Date().toISOString(),
      erro_verificacao: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const outputDir = path.resolve("scripts/import/output");
  await fs.mkdir(outputDir, { recursive: true });
  const audited = [];
  for (const source of sources) audited.push(await verifySource(source));

  const accepted = audited.filter((source) => source.pode_importar);
  const refused = audited.filter((source) => source.tipo_fonte === "recusada");
  const manual = audited.filter((source) => !source.pode_importar && source.tipo_fonte !== "recusada");
  const report = `# Relatório de fontes web para questões\n\n` +
    `Auditoria gerada em ${new Date().toISOString()}. O pipeline não contorna bloqueios, não extrai bancos privados e não importa fontes sem permissão confirmada.\n\n` +
    `## Resumo\n\n- Fontes analisadas: ${audited.length}\n- Aceitas para pipeline oficial: ${accepted.length}\n- Recusadas: ${refused.length}\n- Exigem verificação manual: ${manual.length}\n\n` +
    `## Fontes aceitas\n\n${accepted.map((source) => `- **${source.fonte_nome}** (${source.vestibular}) — ${source.fonte_url} — estimativa: ${source.quantidade_estimada}; HTTP: ${source.http_status ?? "não confirmado"}. ${source.observacoes}`).join("\n")}\n\n` +
    `## Fontes oficiais que exigem verificação manual\n\n${manual.map((source) => `- **${source.fonte_nome}** (${source.vestibular}) — ${source.fonte_url} — HTTP: ${source.http_status ?? "não confirmado"}. ${source.observacoes}`).join("\n")}\n\n` +
    `## Fontes recusadas\n\n${refused.map((source) => `- **${source.fonte_nome}** — ${source.motivo} ${source.observacoes}`).join("\n")}\n\n` +
    `## Web pública e licenciável\n\nNenhuma fonte não oficial recebeu autorização suficientemente clara nesta execução. Por segurança, o total importado como \`WEB_PUBLIC\` ou \`LICENSE_REQUIRED\` é zero.\n`;

  await Promise.all([
    fs.writeFile(path.join(outputDir, "banco-extenso-fontes.json"), JSON.stringify(audited, null, 2), "utf8"),
    fs.writeFile(path.join(outputDir, "fontes-web-questoes-relatorio.md"), report, "utf8"),
  ]);
  console.log(JSON.stringify({ analyzed: audited.length, accepted: accepted.length, refused: refused.length, manualReview: manual.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
