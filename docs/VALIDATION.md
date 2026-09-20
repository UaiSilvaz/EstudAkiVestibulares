# Validacao e Gates

A validacao combina checagens automaticas, auditoria humana e provas de app.
O objetivo e evitar tres erros graves: questao incompleta, gabarito errado e
conteudo misturado entre questoes.

## Relatorios

`npm run exams:validate` gera:

- `reports/import-summary.json`
- `reports/validation-report.json`
- `reports/missing-questions.json`
- `reports/duplicate-questions.json`
- `reports/answer-conflicts.json`
- `reports/assets-errors.json`
- `reports/enem-2024-dia-2-caderno-5-amarelo-audit.md`

Copias com prefixo do corpus tambem ficam em `data/reports/`.

## Checagens automaticas

- sequencia oficial esperada;
- quantidade de questoes logicas e ocorrencias impressas;
- cinco alternativas por ocorrencia;
- vinculo com gabarito oficial;
- anulacoes esperadas;
- hashes de prova, gabarito, configuracao e assets;
- duplicidades por hash e por enunciado normalizado;
- recortes administrativos e imagens com dimensoes validas;
- status de extracao de cada questao.

## Gates humanos

Antes de publicar, o pacote tambem precisa de:

- auditoria visual lado a lado com o PDF oficial;
- confirmacao humana do gabarito;
- classificacao pedagogica completa e auditada;
- resolucao autoral completa e auditada;
- evidencia de preview, resposta, correcao, mobile e pagina original no admin.

## Estado do piloto 2024/D2

Ultima auditoria local: `2026-08-27T00:38:43.131Z`.

- Status: `NEEDS_REVIEW`.
- Questoes logicas: 90/90.
- Ocorrencias estruturadas: 90.
- Alternativas: 430/450.
- Gabaritos associados: 90/90.
- Duplicidades detectadas pelo auditor novo: 0 grupos.
- Conflitos de gabarito detectados pelo auditor novo: 2 registros.
- Gate: `canPublish=false`.

Bloqueios principais: extracao estrutural falhou, classificacao pedagogica
ausente, revisao visual pendente, revisao humana do gabarito pendente e teste
de integracao no app ainda nao executado.
