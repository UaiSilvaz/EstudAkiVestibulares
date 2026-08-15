# Server Layer

Esta pasta concentra codigo que so deve rodar no servidor: seguranca HTTP,
validacao de requests, rate limiting, acesso a banco e integracoes externas.

Camadas recomendadas:

- `src/app`: rotas, layouts e Route Handlers finos.
- `src/components`: UI reutilizavel, sem segredos e sem acesso direto ao banco.
- `src/server/security`: guardas HTTP, headers, uploads, rate limits e helpers de request.
- `src/lib`: legado compartilhado enquanto os dominios sao migrados com calma.
- `scripts`: automacoes e pipelines locais, nunca chamados pelo cliente.

Ao criar uma feature grande, mantenha o Route Handler como BFF fino e mova a
regra de negocio para um modulo server-only. Isso deixa o projeto pronto para
extrair um microservico real no futuro sem duplicar regra nem vazar segredo.
