# Pipeline de Importacao Oficial

O pipeline e deliberadamente em etapas. Extração, auditoria, importacao,
revisao e publicacao sao atos separados para impedir que OCR ou parsing
coloquem questoes oficiais diretamente em producao.

## Comandos

```bash
npm run exams:discover
npm run exams:download
npm run exams:extract
npm run exams:validate
npm run exams:import -- --corpus-dir data/QUESTÕES/processamento/enem-2024-dia-2-caderno-5-amarelo
```

O ultimo comando e dry-run por padrao. Para gravar no banco, use
`--confirm-import`; para revisar e publicar, o importador exige evidencias
adicionais como auditoria visual, classificacoes, resolucoes e provas de app.

## Etapas

1. Descoberta: registra e verifica fontes oficiais, URLs e hashes.
2. Download/registro: copia os PDFs oficiais para `storage/official-files` e
   sincroniza `OfficialSource`, `OfficialFile` e `ProvaAntiga`.
3. Extracao: gera `questoes-estruturadas.json`, paginas, recortes e
   proveniencia a partir do PDF oficial.
4. Gabarito: vincula cada ocorrencia ao PDF oficial de respostas.
5. Validacao: cria relatorios em `reports/` e `data/reports/`.
6. Importacao: cria questoes em `PENDING_REVIEW`, sem publicacao.
7. Revisao: confere visualmente cada questao, gabarito, pedagogia e resolucao.
8. Publicacao: so ocorre quando o gate atomico confirma todos os requisitos.

## Artefatos esperados

- `checkpoint.json`: permite retomar a extracao sem perder progresso.
- `proveniencia.json`: prova, gabarito, configuracao, hashes e parser usado.
- `gabarito-oficial.json`: respostas oficiais normalizadas.
- `relatorio-validacao.json` e `.md`: saida do validador estrutural.
- `reports/import-summary.json`: resumo operacional do piloto atual.

## Falha fechada

Se uma etapa identificar ausencia de alternativa, divergencia de gabarito,
hash invalido, asset inacessivel, duplicidade suspeita ou revisao pendente, o
pacote fica em `NEEDS_REVIEW` e nao deve ser publicado.
