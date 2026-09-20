import { spawnSync } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { findDuplicateGroups } from "../src/ingestion/dedupe";
import { getSourceProvider, sourceProviders } from "../src/ingestion/registry";
import { slugify } from "../src/ingestion/text";
import type { DiscoveredExam } from "../src/ingestion/types";
import { readCorpusBundle, relativeToRepo } from "./enem/corpus-importer-core";

loadEnvConfig(process.cwd());

const db = new PrismaClient();
const args = process.argv.slice(2);
const command = args[0] ?? "help";
const PROCESSING_DIR = path.join("data", "QUEST\u00d5ES", "processamento");

function option(name: string) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function flag(name: string) {
  return args.includes(name);
}

function numberOption(name: string) {
  const value = option(name);
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer.`);
  return parsed;
}

async function assertDirectory(directory: string) {
  const resolved = path.resolve(directory);
  await access(resolved);
  return resolved;
}

function bookletNumber(exam: DiscoveredExam) {
  const value = exam.bookletCode?.match(/\d+/)?.[0];
  return value ? Number(value) : undefined;
}

async function resolveInepCorpusDirectory() {
  const explicit = option("--corpus-dir");
  if (explicit) return assertDirectory(explicit);

  const year = numberOption("--year");
  const day = numberOption("--day");
  if (!year || !day) {
    throw new Error("Provide --corpus-dir or both --year and --day.");
  }

  const discovery = await getSourceProvider("inep").discoverExams({ year, day });
  const exam = discovery.exams[0];
  const booklet = exam ? bookletNumber(exam) : undefined;
  if (!exam || !booklet || !exam.bookletColor) {
    throw new Error(`No audited INEP corpus entry found for year=${year} day=${day}.`);
  }

  return assertDirectory(
    path.join(
      PROCESSING_DIR,
      `enem-${year}-dia-${day}-caderno-${booklet}-${slugify(exam.bookletColor)}`,
    ),
  );
}

function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

async function discover() {
  const providerSlug = option("--provider") ?? "inep";
  const provider = getSourceProvider(providerSlug);
  const result = await provider.discoverExams({
    year: numberOption("--year"),
    day: numberOption("--day"),
    limit: numberOption("--limit"),
    refresh: flag("--refresh"),
  });

  printJson({
    command: "discover",
    dryRun: true,
    provider: {
      slug: provider.slug,
      name: provider.name,
      enabled: provider.enabled,
      baseUrl: provider.baseUrl,
      rateLimit: provider.rateLimit,
    },
    exams: result.exams,
    warnings: result.warnings,
    logs: result.logs,
  });
}

async function validate() {
  const providerSlug = option("--provider") ?? "inep";
  if (providerSlug !== "inep" && !option("--corpus-dir")) {
    const provider = getSourceProvider(providerSlug);
    const result = await provider.discoverExams({
      year: numberOption("--year"),
      day: numberOption("--day"),
      limit: numberOption("--limit"),
    });
    printJson({
      command: "validate",
      provider: providerSlug,
      valid: false,
      reviewRequired: true,
      examsDiscovered: result.exams.length,
      warnings: [
        ...result.warnings,
        "Provider has no extraction validator enabled yet.",
      ],
    });
    return;
  }

  const corpusDir =
    option("--corpus-dir") ?? (providerSlug === "inep" ? await resolveInepCorpusDirectory() : undefined);
  if (!corpusDir) throw new Error("Provide --corpus-dir for validation.");

  const bundle = await readCorpusBundle(corpusDir);
  printJson({
    command: "validate",
    provider: providerSlug,
    corpusDir: relativeToRepo(bundle.directory),
    sourceJsonSha256: bundle.sourceJsonSha256,
    report: bundle.report,
    publicationGate: bundle.validation.publicationGate,
  });
  if (!bundle.report.valid) {
    throw new Error(`Invalid corpus: ${bundle.report.errors.join(" ")}`);
  }
}

function runImportScript(extraArgs: string[]) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    executable,
    ["tsx", "scripts/enem/import-corpus-booklet.ts", ...extraArgs],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Delegated ENEM corpus command exited with status ${result.status}.`);
  }
}

async function importQuestions() {
  const providerSlug = option("--provider") ?? "inep";
  if (providerSlug !== "inep") {
    throw new Error(`${providerSlug} import is not enabled yet. Use discover first and keep sources in review.`);
  }

  const corpusDir = await resolveInepCorpusDirectory();
  if (!flag("--confirm-import")) {
    const bundle = await readCorpusBundle(corpusDir);
    printJson({
      command: "import",
      mode: "DRY_RUN",
      provider: providerSlug,
      corpusDir: relativeToRepo(bundle.directory),
      report: bundle.report,
      next: "Run with --confirm-import to create/update REVIEW records only.",
    });
    return;
  }

  runImportScript([
    "--corpus-dir",
    relativeToRepo(corpusDir),
    "--confirm-import",
    "--actor",
    option("--actor") ?? "estudaki-ingestion-cli",
  ]);
}

async function dedupe() {
  const limit = numberOption("--limit");
  const questions = await db.question.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      statement: true,
      supportText: true,
      alternatives: true,
      year: true,
      exam: true,
      sourceName: true,
      vestibular: { select: { name: true } },
    },
  });
  const groups = findDuplicateGroups(
    questions.map((question) => ({
      id: question.id,
      statement: question.statement,
      supportText: question.supportText,
      alternatives: question.alternatives,
      year: question.year,
      exam: question.exam,
      boardName: question.sourceName ?? question.vestibular.name,
    })),
  );
  const payload = {
    command: "dedupe",
    dryRun: true,
    scanned: questions.length,
    groups: groups.length,
    exactGroups: groups.filter((group) => group.kind === "EXACT_DUPLICATE").length,
    likelyGroups: groups.filter((group) => group.kind === "LIKELY_DUPLICATE").length,
    duplicates: groups,
    note: "No question is deleted automatically. Review EXACT_DUPLICATE and LIKELY_DUPLICATE groups manually.",
  };

  if (flag("--write-report")) {
    const reportDir = path.resolve("reports");
    await mkdir(reportDir, { recursive: true });
    await writeFile(
      path.join(reportDir, "duplicate-questions.json"),
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8",
    );
  }

  printJson(payload);
}

function collectPublicationArgs(corpusDir: string) {
  const required = [
    "--visual-audit",
    "--app-evidence",
    "--resolutions",
    "--resolution-audit",
    "--classifications",
    "--classification-audit",
  ];
  const missing = required.filter((name) => !option(name));
  const passThrough = [
    "--visual-audit",
    option("--visual-audit"),
    "--app-evidence",
    option("--app-evidence"),
    "--resolutions",
    option("--resolutions"),
    "--resolution-audit",
    option("--resolution-audit"),
    "--classifications",
    option("--classifications"),
    "--classification-audit",
    option("--classification-audit"),
    "--review-evidence",
    option("--review-evidence"),
  ].filter((value): value is string => Boolean(value));
  return {
    missing,
    args: [
      "--corpus-dir",
      relativeToRepo(corpusDir),
      flag("--confirm-publish") ? "--confirm-publish" : "--publish",
      "--actor",
      option("--actor") ?? "estudaki-ingestion-cli",
      ...passThrough,
    ],
  };
}

async function publish() {
  const providerSlug = option("--provider") ?? "inep";
  if (providerSlug !== "inep") {
    throw new Error(`${providerSlug} publication is not enabled yet.`);
  }
  const corpusDir = await resolveInepCorpusDirectory();
  const publication = collectPublicationArgs(corpusDir);
  if (publication.missing.length) {
    printJson({
      command: "publish",
      provider: providerSlug,
      ready: false,
      dryRun: true,
      corpusDir: relativeToRepo(corpusDir),
      missingEvidence: publication.missing,
      requiredEvidence: "visual audit, app evidence, authorial resolutions, resolution audit, classifications and classification audit",
      note: "Publication is fail-closed. Nothing was published.",
    });
    return;
  }

  runImportScript(publication.args);
}

function help() {
  printJson({
    commands: [
      "discover",
      "import",
      "validate",
      "dedupe",
      "publish",
      "providers",
    ],
    examples: [
      "npm run questions:discover -- --provider=inep --year=2024",
      "npm run questions:import -- --provider=inep --year=2024 --day=2",
      "npm run questions:import -- --provider=inep --year=2024 --day=2 --confirm-import",
      "npm run questions:validate -- --provider=inep --year=2024 --day=2",
      "npm run questions:dedupe -- --limit=10000 --write-report",
      "npm run questions:publish -- --provider=inep --year=2022 --day=2 --visual-audit <file> --app-evidence <file> --resolutions <file> --resolution-audit <file> --classifications <file> --classification-audit <file>",
    ],
  });
}

async function main() {
  if (command === "discover") return discover();
  if (command === "import") return importQuestions();
  if (command === "validate") return validate();
  if (command === "dedupe") return dedupe();
  if (command === "publish") return publish();
  if (command === "providers") {
    return printJson({
      providers: sourceProviders.map((provider) => ({
        slug: provider.slug,
        name: provider.name,
        enabled: provider.enabled,
        priority: provider.priority,
        baseUrl: provider.baseUrl,
        rateLimit: provider.rateLimit,
      })),
    });
  }
  help();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
