# Pipeline de Importação Oficial

O pipeline é deliberadamente dividido em etapas. Extração, auditoria, importação,
revisão e publicação são atos separados para impedir que OCR ou parsing
coloquem questões oficiais diretamente em produção.

## Comandos

```bash
npm run exams:discover
npm run exams:download
npm run exams:extract
npm run exams:validate
npm run exams:import -- --corpus-dir data/QUESTÕES/processamento/enem-2024-dia-2-caderno-5-amarelo
```

O último comando é executado em modo dry-run por padrão. Para gravar no banco, use
`--confirm-import`; para revisar e publicar, o importador exige evidências
adicionais como auditoria visual, classificações, resoluções e provas do aplicativo.

## Etapas

1. Descoberta: registra e verifica fontes oficiais, URLs e hashes.
2. Download/registro: copia os PDFs oficiais para `storage/official-files` e
   sincroniza `OfficialSource`, `OfficialFile` e `ProvaAntiga`.
3. Extração: gera `questoes-estruturadas.json`, páginas, recortes e
   proveniência a partir do PDF oficial.
4. Gabarito: vincula cada ocorrencia ao PDF oficial de respostas.
5. Validação: cria relatórios em `reports/` e `data/reports/`.
6. Importação: cria questões em `PENDING_REVIEW`, sem publicação.
7. Revisão: confere visualmente cada questão, gabarito, pedagogia e resolução.
8. Publicação: só ocorre quando o gate atomico confirma todos os requisitos.

## Artefatos esperados

- `checkpoint.json`: permite retomar a extração sem perder progresso.
- `proveniencia.json`: prova, gabarito, configuração, hashes e parser usado.
- `gabarito-oficial.json`: respostas oficiais normalizadas.
- `relatorio-validacao.json` e `.md`: saída do validador estrutural.
- `reports/import-summary.json`: resumo operacional do piloto atual.

## Falha fechada

Se uma etapa identificar ausencia de alternativa, divergência de gabarito,
hash inválido, asset inacessível, duplicidade suspeita ou revisão pendente, o
pacote fica em `NEEDS_REVIEW` e não deve ser publicado.
