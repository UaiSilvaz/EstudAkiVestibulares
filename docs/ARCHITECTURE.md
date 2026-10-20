# EstudAki Architecture

O EstudAki roda como um Next.js App Router com um BFF interno. A organizacao
profissional aqui e modular por domínio, mas ainda leve para programar.

## Camadas

- `src/app`: fronteira HTTP e UI de rotas. Pages e Route Handlers devem ser pequenos.
- `src/components`: componentes visuais e interativos. Client Components não acessam banco, secrets ou storage privado.
- `src/server`: regras server-only: segurança, contratos HTTP, integrações e serviços.
- `src/lib`: módulos legados/compartilhados em migração gradual para domínios.
- `prisma`: schema e migrations como contrato do banco.
- `scripts`: importacoes, seeds e pipelines operacionais.
- `public`: somente assets publicos pequenos e necessarios ao produto.
- `storage`, `data`, `private-*`: artefatos locais/privados fora do Git.

## BFF e microservicos

Cada pasta em `src/app/api` é uma fachada HTTP. A regra pesada deve ficar em
módulos de servidor. Quando um domínio crescer, extraia na ordem:

1. Contratos e validação no Route Handler.
2. Servico em `src/server` ou domínio dedicado.
3. DTOs minimos para respostas.
4. Integracao externa atras de uma interface pequena.
5. Só depois, um microservico separado com banco/fila/provisionamento proprios.

Dominios naturais do produto:

- Auth e usuários.
- Questões e provas antigas.
- Materiais e commerce.
- Jornada, estudo e gamificacao.
- Admin/importacoes oficiais.
- Redação e IA assistida.

## Regras de código

- Valide a entrada em toda rota pública.
- Autorize perto do dado, não apenas na UI.
- Retorne DTOs, nunca registros completos do Prisma quando a resposta vai ao cliente.
- Não importe `process.env` fora de servidor/config.
- Arquivos grandes vivem em Supabase Storage ou storage local ignorado pelo Git.
