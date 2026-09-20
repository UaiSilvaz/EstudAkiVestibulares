# Schema do Banco Nacional de Questoes

Este documento descreve o contrato minimo para uma questao oficial entrar no
EstudAki. A fonte de verdade operacional e o `prisma/schema.prisma`; os JSONs
do corpus existem como artefatos auditaveis antes da importacao.

## Modelos principais

- `Question`: questao exibida ao aluno. Deve manter `sourceType=OFFICIAL`,
  `contentHash`, `reviewState`, metadados de prova e status de publicacao.
- `QuestionAlternative`: alternativas A-E, sempre vinculadas a uma `Question`.
- `QuestionImage`: imagens do enunciado, alternativas, fac-simile ou recorte
  administrativo, com hash, dimensoes, pagina e regiao original quando houver.
- `OfficialSource` e `OfficialFile`: origem institucional, URL oficial,
  armazenamento local, SHA-256 e estado de processamento.
- `OfficialAnswerKey`: gabarito oficial por ocorrencia, com alternativa,
  anulacao quando aplicavel, hash e URL do PDF de origem.
- `QuestionImportJob`: execucao de importacao, contadores, gate editorial e
  logs.
- `QuestionExtraction`, `QuestionBlock`, `QuestionRevision`,
  `QuestionPedagogicalMetadata` e `QuestionAuthorialResolution`: trilha de
  extracao, blocos visuais/textuais, revisao, classificacao pedagogica e
  resolucao autoral.
- `ProvaAntiga` e `ProvaAntigaQuestao`: prova oficial antiga e vinculo entre
  a prova e as questoes importadas.

## Contrato de cada questao do corpus

Cada item em `questoes-estruturadas.json` precisa conter:

- Identidade: `id`, `corpusId`, `year`, `day`, `bookletNumber`,
  `bookletColor`, `officialNumber`, `language`.
- Proveniencia: URL da pagina oficial, URL do PDF, caminho local, pagina(s),
  regioes de origem, hash do PDF e hash de configuracao.
- Conteudo: `supportText`, `statement`, `command`, `blocks` ordenados e
  `alternatives` A-E.
- Resposta oficial: `answer`, `answerSituation`, `officialAnswerKey`.
- Assets: `assets`, `originalCrops` e imagens de alternativas com
  `artifactPath`, `sha256`, `width`, `height` e relacao semantica.
- Controle editorial: `contentHash`, `extractionStatus`, `reviewState`,
  `confidence` e notas de revisao.

## Regras de publicacao

Uma questao oficial so pode ficar publica quando:

- tiver exatamente cinco alternativas, salvo tratamento explicito de anulacao;
- preservar texto, imagens, creditos e ordem visual do fac-simile;
- estiver vinculada ao gabarito oficial com hash e URL;
- tiver classificacao pedagogica e resolucao autoral revisadas;
- passar no preview de aluno, correcao, mobile e pagina original para admin;
- tiver `reviewState=APPROVED` e job em `READY_TO_PUBLISH` antes da publicacao.

O piloto ENEM 2024, 2o dia, caderno 5 amarelo ainda nao atende a essas regras.
