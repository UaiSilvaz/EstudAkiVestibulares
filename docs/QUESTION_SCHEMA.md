# Schema do Banco Nacional de Questões

Este documento descreve o contrato mínimo para uma questão oficial entrar no
EstudAki. A fonte de verdade operacional é o `prisma/schema.prisma`; os JSONs
do corpus existem como artefatos auditáveis antes da importação.

## Modelos principais

- `Question`: questão exibida ao aluno. Deve manter `sourceType=OFFICIAL`,
  `contentHash`, `reviewState`, metadados de prova e status de publicação.
- `QuestionAlternative`: alternativas A-E, sempre vinculadas a uma `Question`.
- `QuestionImage`: imagens do enunciado, alternativas, fac-símile ou recorte
  administrativo, com hash, dimensões, página e regiao original quando houver.
- `OfficialSource` e `OfficialFile`: origem institucional, URL oficial,
  armazenamento local, SHA-256 e estado de processamento.
- `OfficialAnswerKey`: gabarito oficial por ocorrencia, com alternativa,
  anulacao quando aplicável, hash e URL do PDF de origem.
- `QuestionImportJob`: execução de importação, contadores, gate editorial e
  logs.
- `QuestionExtraction`, `QuestionBlock`, `QuestionRevision`,
  `QuestionPedagogicalMetadata` e `QuestionAuthorialResolution`: trilha de
  extração, blocos visuais/textuais, revisão, classificação pedagógica e
  resolução autoral.
- `ProvaAntiga` e `ProvaAntigaQuestao`: prova oficial antiga e vínculo entre
  a prova e as questões importadas.

## Contrato de cada questão do corpus

Cada item em `questoes-estruturadas.json` precisa conter:

- Identidade: `id`, `corpusId`, `year`, `day`, `bookletNumber`,
  `bookletColor`, `officialNumber`, `language`.
- Proveniência: URL da página oficial, URL do PDF, caminho local, página(s),
  regiões de origem, hash do PDF e hash de configuração.
- Conteúdo: `supportText`, `statement`, `command`, `blocks` ordenados e
  `alternatives` A-E.
- Resposta oficial: `answer`, `answerSituation`, `officialAnswerKey`.
- Assets: `assets`, `originalCrops` e imagens de alternativas com
  `artifactPath`, `sha256`, `width`, `height` e relação semantica.
- Controle editorial: `contentHash`, `extractionStatus`, `reviewState`,
  `confidence` e notas de revisão.

## Regras de publicação

Uma questão oficial só pode ficar pública quando:

- tiver exatamente cinco alternativas, salvo tratamento explicito de anulacao;
- preservar texto, imagens, créditos e ordem visual do fac-símile;
- estiver vinculada ao gabarito oficial com hash e URL;
- tiver classificação pedagógica e resolução autoral revisadas;
- passar no preview de aluno, correção, mobile e página original para admin;
- tiver `reviewState=APPROVED` e job em `READY_TO_PUBLISH` antes da publicação.

O piloto ENEM 2024, 2o dia, caderno 5 amarelo ainda não atende a essas regras.
