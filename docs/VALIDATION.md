# Validação e Gates

A validação combina checagens automáticas, auditoria humana e provas de app.
O objetivo é evitar três erros graves: questão incompleta, gabarito errado e
conteúdo misturado entre questões.

## Relatórios

`npm run exams:validate` gera:

- `reports/import-summary.json`
- `reports/validation-report.json`
- `reports/missing-questions.json`
- `reports/duplicate-questions.json`
- `reports/answer-conflicts.json`
- `reports/assets-errors.json`
- `reports/enem-2024-dia-2-caderno-5-amarelo-audit.md`

Copias com prefixo do corpus tambem ficam em `data/reports/`.

## Checagens automáticas

- sequencia oficial esperada;
- quantidade de questões lógicas e ocorrências impressas;
- cinco alternativas por ocorrencia;
- vínculo com gabarito oficial;
- anulações esperadas;
- hashes de prova, gabarito, configuração e assets;
- duplicidades por hash e por enunciado normalizado;
- recortes administrativos e imagens com dimensões válidas;
- status de extração de cada questão.

## Gates humanos

Antes de publicar, o pacote tambem precisa de:

- auditoria visual lado a lado com o PDF oficial;
- confirmacao humana do gabarito;
- classificação pedagógica completa e auditada;
- resolução autoral completa e auditada;
- evidência de preview, resposta, correção, mobile e página original no admin.

## Estado do piloto 2024/D2

Ultima auditoria local: `2026-08-27T00:38:43.131Z`.

- Status: `NEEDS_REVIEW`.
- Questões lógicas: 90/90.
- Ocorrências estruturadas: 90.
- Alternativas: 430/450.
- Gabaritos associados: 90/90.
- Duplicidades detectadas pelo auditor novo: 0 grupos.
- Conflitos de gabarito detectados pelo auditor novo: 2 registros.
- Gate: `canPublish=false`.

Bloqueios principais: extração estrutural falhou, classificação pedagógica
ausente, revisão visual pendente, revisão humana do gabarito pendente e teste
de integracao no app ainda não executado.
