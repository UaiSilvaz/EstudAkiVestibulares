# EstudAki Architecture

O EstudAki roda como um Next.js App Router com um BFF interno. A organizacao
profissional aqui e modular por dominio, mas ainda leve para programar.

## Camadas

- `src/app`: fronteira HTTP e UI de rotas. Pages e Route Handlers devem ser pequenos.
- `src/components`: componentes visuais e interativos. Client Components nao acessam banco, secrets ou storage privado.
- `src/server`: regras server-only: seguranca, contratos HTTP, integracoes e servicos.
- `src/lib`: modulos legados/compartilhados em migracao gradual para dominios.
- `prisma`: schema e migrations como contrato do banco.
- `scripts`: importacoes, seeds e pipelines operacionais.
- `public`: somente assets publicos pequenos e necessarios ao produto.
- `storage`, `data`, `private-*`: artefatos locais/privados fora do Git.

## BFF e microservicos

Cada pasta em `src/app/api` e uma fachada HTTP. A regra pesada deve ficar em
modulos de servidor. Quando um dominio crescer, extraia na ordem:

1. Contratos e validacao no Route Handler.
2. Servico em `src/server` ou dominio dedicado.
3. DTOs minimos para respostas.
4. Integracao externa atras de uma interface pequena.
5. So depois, um microservico separado com banco/fila/provisionamento proprios.

Dominios naturais do produto:

- Auth e usuarios.
- Questoes e provas antigas.
- Materiais e commerce.
- Jornada, estudo e gamificacao.
- Admin/importacoes oficiais.
- Redacao e IA assistida.

## Regras de codigo

- Valide entrada em toda rota publica.
- Autorize perto do dado, nao apenas na UI.
- Retorne DTOs, nunca registros completos do Prisma quando a resposta vai ao cliente.
- Nao importe `process.env` fora de servidor/config.
- Arquivos grandes vivem em Supabase Storage ou storage local ignorado pelo Git.
