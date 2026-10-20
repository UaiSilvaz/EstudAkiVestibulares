# Server Layer

Esta pasta concentra código que só deve rodar no servidor: segurança HTTP,
validação de requests, rate limiting, acesso a banco e integrações externas.

Camadas recomendadas:

- `src/app`: rotas, layouts e Route Handlers finos.
- `src/components`: UI reutilizavel, sem segredos e sem acesso direto ao banco.
- `src/server/security`: guardas HTTP, headers, uploads, rate limits e helpers de request.
- `src/lib`: legado compartilhado enquanto os domínios são migrados com calma.
- `scripts`: automações e pipelines locais, nunca chamados pelo cliente.

Ao criar uma feature grande, mantenha o Route Handler como BFF fino e mova a
regra de negocio para um módulo server-only. Isso deixa o projeto pronto para
extrair um microservico real no futuro sem duplicar regra nem vazar segredo.
