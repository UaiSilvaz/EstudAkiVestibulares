# Question Ingestion Architecture

This is the working architecture for the EstudAki canonical question bank.
The goal is structured native questions, not page screenshots.

## Current Map

- `prisma/schema.prisma`: canonical question tables, official files, answer
  keys, import jobs, blocks, images, revisions and review metadata.
- `SourceProvider`: provider registry/config table for official acquisition
  sources. INEP is active; VUNESP and FGV start disabled until official
  discovery/extraction is implemented.
- `OfficialSource` / `OfficialFile`: official URL, local storage, SHA-256,
  processing state and audit trail.
- `Question`: student-facing question record. Official records must remain in
  review until gated.
- `QuestionAlternative`: structured alternatives, including image-only or
  image-plus-text alternatives.
- `QuestionImage`: extracted visual assets and admin references. Student
  assets are separate from admin facsimiles/original crops.
- `QuestionBlock`: ordered statement/support/image/credit blocks. The public
  renderer now prefers these blocks when present.
- `QuestionExtraction`, `OfficialAnswerKey`, `QuestionRevision`,
  `QuestionPedagogicalMetadata` and `QuestionAuthorialResolution`: provenance,
  answer validation, editorial trail, classification and authored resolution.
- `scripts/enem/corpus_pipeline.py`: existing ENEM extraction engine.
- `scripts/enem/import-corpus-booklet.ts`: existing transactional import,
  review and publish gate.
- `src/ingestion`: provider contract, INEP inventory provider, validation and
  dedupe helpers.
- `scripts/questions.ts`: generic CLI facade for discovery, validation, import,
  dedupe and publish operations.

## Provider Contract

Every provider is expected to implement these stages:

1. `discoverExams`
2. `fetchExam`
3. `fetchAnswerKey`
4. `extractQuestions`
5. `normalize`
6. `validate`

The implementation must prefer official/public sources. Secondary sources may
help discovery, but cannot become official answer provenance.

## Active Provider

`inep` reads the audited inventory at:

`data/provas/enem/INVENTARIO_OFICIAL_ENEM_2009_2025.md`

It expands only official INEP/Gov.br URLs, returns the 34 audited ENEM
booklets from 2009 to 2025, and delegates extraction/import/publishing to the
existing ENEM corpus pipeline.

## Planned Providers

`vunesp` and `fgv` are registered but disabled. Their discovery methods return
warnings and no exams. This prevents accidental scraping or answer invention
while preserving the extension points for UNESP/ETEC/FATEC, OAB and contests.

## CLI

Dry-run discovery:

```bash
npm run questions:discover -- --provider=inep --year=2024
```

Dry-run validation of an existing ENEM corpus:

```bash
npm run questions:validate -- --provider=inep --year=2024 --day=2
```

Dry-run import:

```bash
npm run questions:import -- --provider=inep --year=2024 --day=2
```

Persist import into review only:

```bash
npm run questions:import -- --provider=inep --year=2024 --day=2 --confirm-import
```

Dedupe report:

```bash
npm run questions:dedupe -- --limit=10000 --write-report
```

Publication remains fail-closed and delegates to the existing gate:

```bash
npm run questions:publish -- --provider=inep --year=2022 --day=2 --visual-audit <file> --app-evidence <file> --resolutions <file> --resolution-audit <file> --classifications <file> --classification-audit <file>
```

Add `--confirm-publish` only after the gate preview is clean.

## Non-Negotiable Rules

- Do not import QConcursos or another private question bank.
- Do not publish a prompt facsimile/screenshot as final student content.
- Store files in storage; keep only references/hashes in the database.
- Unknown or low-confidence answer keys must remain `REVIEW_REQUIRED`.
- Suspected duplicates are never deleted automatically.
- Official sources, hashes and page/region metadata must remain auditable.
