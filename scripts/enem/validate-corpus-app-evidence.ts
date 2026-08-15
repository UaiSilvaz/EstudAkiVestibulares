import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  APP_EVIDENCE_CHECKS,
  readAppEvidence,
  relativeToRepo,
  repoPath,
} from "./corpus-importer-core";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function exactKeys(value: object, expected: string[]) {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
}

function validateSchema(value: unknown) {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ["Schema: a raiz deve ser um objeto."];
  }
  const evidence = value as Record<string, unknown>;
  const rootKeys = [
    "schemaVersion",
    "corpusId",
    "complete",
    "testedAt",
    "tester",
    "baseUrl",
    "testedSourceIds",
    "checks",
    "evidence",
    "notes",
  ];
  if (!exactKeys(evidence, rootKeys)) errors.push("Schema: propriedades da raiz divergem do contrato.");
  if (evidence.schemaVersion !== 1) errors.push("Schema: schemaVersion deve ser 1.");
  if (evidence.complete !== true) errors.push("Schema: complete deve ser true.");
  for (const field of ["corpusId", "tester", "notes"] as const) {
    if (typeof evidence[field] !== "string" || !evidence[field].trim()) {
      errors.push(`Schema: ${field} deve ser uma string não vazia.`);
    }
  }
  if (typeof evidence.testedAt !== "string" || Number.isNaN(Date.parse(evidence.testedAt))) {
    errors.push("Schema: testedAt deve ser date-time válido.");
  }
  try {
    if (typeof evidence.baseUrl !== "string") throw new Error();
    new URL(evidence.baseUrl);
  } catch {
    errors.push("Schema: baseUrl deve ser URI válida.");
  }
  const sourceIds = evidence.testedSourceIds;
  if (
    !Array.isArray(sourceIds) ||
    sourceIds.length === 0 ||
    sourceIds.some((item) => typeof item !== "string" || !item.trim()) ||
    new Set(sourceIds).size !== sourceIds.length
  ) {
    errors.push("Schema: testedSourceIds deve conter strings únicas e não vazias.");
  }
  const checks = evidence.checks;
  if (!checks || typeof checks !== "object" || Array.isArray(checks)) {
    errors.push("Schema: checks deve ser um objeto.");
  } else {
    if (!exactKeys(checks, [...APP_EVIDENCE_CHECKS])) {
      errors.push("Schema: propriedades de checks divergem do contrato.");
    }
    for (const check of APP_EVIDENCE_CHECKS) {
      if ((checks as Record<string, unknown>)[check] !== true) {
        errors.push(`Schema: check ${check} deve ser true.`);
      }
    }
  }
  const items = evidence.evidence;
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("Schema: evidence deve conter pelo menos um artefato.");
  } else {
    items.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push(`Schema: evidence[${index}] deve ser objeto.`);
        return;
      }
      const record = item as Record<string, unknown>;
      if (!exactKeys(record, record.note === undefined ? ["path", "sha256", "kind"] : ["path", "sha256", "kind", "note"])) {
        errors.push(`Schema: propriedades de evidence[${index}] divergem do contrato.`);
      }
      if (typeof record.path !== "string" || !record.path.trim()) errors.push(`Schema: evidence[${index}].path inválido.`);
      if (typeof record.kind !== "string" || !record.kind.trim()) errors.push(`Schema: evidence[${index}].kind inválido.`);
      if (typeof record.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(record.sha256)) {
        errors.push(`Schema: evidence[${index}].sha256 inválido.`);
      }
      if (record.note !== undefined && typeof record.note !== "string") errors.push(`Schema: evidence[${index}].note inválido.`);
    });
  }
  return errors;
}

async function main() {
  const corpusInput = argument("--corpus-dir");
  const evidenceInput = argument("--evidence");
  const outputInput = argument("--output");
  if (!corpusInput || !evidenceInput || !outputInput) {
    throw new Error(
      "Uso: tsx scripts/enem/validate-corpus-app-evidence.ts --corpus-dir <dir> --evidence <json> --output <json>",
    );
  }

  const corpusDirectory = repoPath(corpusInput);
  const evidencePath = repoPath(evidenceInput);
  const outputPath = repoPath(outputInput);
  const questions = JSON.parse(
    await readFile(path.join(corpusDirectory, "questoes-estruturadas.json"), "utf8"),
  ) as Array<{ id: string; corpusId?: string; pilotId?: string }>;
  const corpusId = questions[0]?.corpusId ?? questions[0]?.pilotId;
  if (!corpusId) throw new Error("O corpus não possui corpusId/pilotId identificável.");

  const rawEvidence = await readFile(evidencePath, "utf8");
  const parsedEvidence = JSON.parse(rawEvidence) as unknown;
  const schemaErrors = validateSchema(parsedEvidence);
  const compatibilityBundle = {
    questions,
    report: { corpusId },
  };
  const gate = await readAppEvidence(evidencePath, compatibilityBundle as never);
  const errors = [...new Set([...schemaErrors, ...gate.errors])];
  const report = {
    schemaVersion: 1,
    validatedAt: new Date().toISOString(),
    corpusDirectory: relativeToRepo(corpusDirectory),
    evidencePath: relativeToRepo(evidencePath),
    evidenceSha256: gate.hash,
    schemaValid: schemaErrors.length === 0,
    importerGateValid: gate.errors.length === 0,
    valid: errors.length === 0,
    sourceOccurrences: questions.length,
    testedSourceIds: gate.evidence.testedSourceIds?.length ?? 0,
    evidenceItems: gate.evidence.evidence?.length ?? 0,
    checks: gate.evidence.checks,
    errors,
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
