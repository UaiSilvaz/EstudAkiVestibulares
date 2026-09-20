# Relatorio final - Banco Nacional de Questoes EstudAki

Data da execucao: 2026-08-27

## Implementado

- Auditoria reproduzivel para corpus oficial em `scripts/enem/audit-corpus-pilot.ts`.
- Aliases operacionais em `package.json`: `exams:discover`, `exams:download`,
  `exams:extract`, `exams:validate`, `exams:import` e `import:enem`.
- Manifesto curto de fontes oficiais em `sources/official-sources.json`.
- Documentacao operacional em `docs/QUESTION_SCHEMA.md`, `docs/SOURCES.md`,
  `docs/IMPORT_PIPELINE.md`, `docs/VALIDATION.md` e `docs/ADD_NEW_EXAM.md`.
- Relatorios gerados em `reports/` e copias prefixadas em `data/reports/`.

## Testado

- `npm run exams:validate`: passou, com status esperado `NEEDS_REVIEW`.
- `npm run enem:corpus:test`: passou, 2 testes.
- `npx prisma validate`: passou.
- `npm run typecheck`: passou.
- `npm run lint`: passou com 3 warnings existentes de `@next/next/no-img-element`.
- `npm run exams:import -- --corpus-dir data/QUESTÕES/processamento/enem-2024-dia-2-caderno-5-amarelo`: bloqueado corretamente pelo gate.

## Fontes utilizadas

- Pagina oficial INEP/Gov.br ENEM 2024.
- PDF oficial da prova: `2024_PV_impresso_D2_CD5.pdf`.
- PDF oficial do gabarito: `2024_GB_impresso_D2_CD5.pdf`.
- Inventario local: `data/provas/enem/INVENTARIO_OFICIAL_ENEM_2009_2025.md`.

## Questoes importadas

Nenhuma questao do ENEM 2024/D2 foi importada ou publicada. O corpus ainda nao
passa nos gates obrigatorios.

## Questoes em revisao

- Corpus: `enem-2024-dia-2-caderno-5-amarelo`.
- Questoes logicas: 90/90.
- Ocorrencias estruturadas: 90.
- Alternativas: 430/450.
- Gabaritos associados: 90/90.
- Referencias de asset: 1040.
- Assets de alternativa mal estruturados: 388.
- Conflitos de gabarito detectados: 2.
- Questoes em revisao: 90.

## Erros encontrados

- Falhas estruturais nas questoes 100, 106, 139, 141, 146, 147, 149, 153 e 162.
- Questao 102 com divergencia/metadado de gabarito pendente.
- Classificacao pedagogica, revisao visual, revisao humana do gabarito e teste
  de integracao no app ainda pendentes.
- `npm run exams:discover` e `npm run exams:download` seguem bloqueados pelo
  estado persistido do piloto 2022/D2: prova `PUBLISHED`, gabarito `APPROVED`;
  o verificador exige ambos `PUBLISHED`.

## Proxima etapa

Corrigir os artefatos do ENEM 2024/D2, especialmente alternativas ausentes,
ordem de blocos, metadados de gabarito e `imageArtifacts` em formato de objeto
estruturado. Depois disso, repetir `npm run exams:validate` e so entao tentar
`npm run exams:import -- --confirm-import`.
