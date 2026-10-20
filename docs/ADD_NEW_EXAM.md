# Adicionar Uma Nova Prova Oficial

Use este checklist para incluir outro caderno sem quebrar a rastreabilidade.

## 1. Registrar a fonte

1. Confirme a página oficial da instituição.
2. Baixe prova e gabarito apenas de domínio oficial.
3. Grave os PDFs em `data/provas/<exame>/<ano>/`.
4. Calcule SHA-256, tamanho e URL.
5. Atualize o inventario correspondente e `sources/official-sources.json`.

## 2. Criar configuração

Crie um JSON em `scripts/enem/config/` com:

- ano, dia, aplicação, modalidade, caderno e cor;
- intervalo oficial de questões;
- PDFs locais e URLs oficiais;
- páginas objetivas, páginas de redação quando houver e layout;
- seções de idioma, áreas e anulações esperadas.

## 3. Rodar o pipeline

```bash
npm run exams:discover
python scripts/enem/corpus_pipeline.py run --config <config> --resume
npm run exams:validate -- --corpus-dir <corpus-gerado>
```

Se a auditoria retornar `NEEDS_REVIEW`, corrija a configuração, os overrides ou
os artefatos editoriais antes de tentar importar.

## 4. Importar somente para revisão

```bash
npm run exams:import -- --corpus-dir <corpus-gerado> --confirm-import
```

A importação deve criar ou atualizar questões em estado de revisão. Não use
publicação como forma de testar parsing.

## 5. Completar evidências

Prepare e audite:

- planilha/JSON de revisão visual;
- classificacoes pedagogicas;
- resoluções autorais;
- evidências do aplicativo;
- backup anterior a publicação.

## 6. Publicar

Use o gate atomico do importador com `--confirm-publish` somente quando todas
as evidências estiverem completas e aprovadas. Se qualquer contador divergir,
pare e gere novo relatório de validação.
