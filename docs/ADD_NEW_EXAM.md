# Adicionar Uma Nova Prova Oficial

Use este checklist para incluir outro caderno sem quebrar a rastreabilidade.

## 1. Registrar a fonte

1. Confirme a pagina oficial da instituicao.
2. Baixe prova e gabarito apenas de dominio oficial.
3. Grave os PDFs em `data/provas/<exame>/<ano>/`.
4. Calcule SHA-256, tamanho e URL.
5. Atualize o inventario correspondente e `sources/official-sources.json`.

## 2. Criar configuracao

Crie um JSON em `scripts/enem/config/` com:

- ano, dia, aplicacao, modalidade, caderno e cor;
- intervalo oficial de questoes;
- PDFs locais e URLs oficiais;
- paginas objetivas, paginas de redacao quando houver e layout;
- secoes de idioma, areas e anulacoes esperadas.

## 3. Rodar o pipeline

```bash
npm run exams:discover
python scripts/enem/corpus_pipeline.py run --config <config> --resume
npm run exams:validate -- --corpus-dir <corpus-gerado>
```

Se a auditoria retornar `NEEDS_REVIEW`, corrija a configuracao, os overrides ou
os artefatos editoriais antes de tentar importar.

## 4. Importar somente para revisao

```bash
npm run exams:import -- --corpus-dir <corpus-gerado> --confirm-import
```

A importacao deve criar ou atualizar questoes em estado de revisao. Nao use
publicacao como forma de testar parsing.

## 5. Completar evidencias

Prepare e audite:

- planilha/JSON de revisao visual;
- classificacoes pedagogicas;
- resolucoes autorais;
- evidencias do app;
- backup anterior a publicacao.

## 6. Publicar

Use o gate atomico do importador com `--confirm-publish` somente quando todas
as evidencias estiverem completas e aprovadas. Se qualquer contador divergir,
pare e gere novo relatorio de validacao.
