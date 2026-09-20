# Fontes Oficiais

O banco nacional deve usar fontes oficiais e rastreaveis. Para ENEM, a fonte
primaria e o portal do INEP/Gov.br, com PDFs baixados de dominios oficiais do
INEP.

## Arquivos de controle

- `sources/official-sources.json`: manifesto curto das fontes usadas no piloto.
- `data/provas/enem/INVENTARIO_OFICIAL_ENEM_2009_2025.md`: inventario
  canonico local de provas, gabaritos, URLs, tamanhos e hashes.
- `data/provas/provas-antigas.json`: manifest usado pela area de provas
  antigas do produto.
- Tabelas `OfficialSource` e `OfficialFile`: espelho persistido no banco.

## Allowlist

Fontes aceitas para ENEM:

- `https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos`
- `https://download.inep.gov.br/enem/provas_e_gabaritos`
- `https://download.inep.gov.br/educacao_basica/enem`

Qualquer arquivo obtido fora desses dominios deve ser tratado como auxiliar e
nao pode alimentar importacao oficial.

## Piloto atual

- Prova: ENEM 2024, 2o dia, caderno 5 amarelo, aplicacao regular.
- PDF da prova: `data/provas/enem/2024/prova-2-dia.pdf`.
- PDF do gabarito: `data/provas/enem/2024/gabarito-2-dia.pdf`.
- Config: `scripts/enem/config/enem-2024-dia-2.json`.
- Corpus: `data/QUESTÕES/processamento/enem-2024-dia-2-caderno-5-amarelo`.

## Verificacao

Use:

```bash
npm run exams:discover
```

Esse comando valida o inventario local contra os registros no banco. Se houver
divergencia de hash, URL, status ou metadado, a execucao falha fechada.
