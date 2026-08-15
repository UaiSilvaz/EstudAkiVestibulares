# Security Notes

## Baseline

- Headers globais de seguranca estao em `src/server/security/headers.ts`.
- Rate limiting em memoria esta disponivel em `src/server/security/rate-limit.ts`.
- Uploads usam checagem de tamanho, extensao/tipo e assinatura binaria.
- Sessoes usam cookies `httpOnly`, `sameSite=lax`, assinatura HMAC e tabela de sessoes quando a migration existe.
- Rotas administrativas sensiveis devem usar `requireAdminApi()`.

## Segredos e dados

- Nunca commitar `.env*`, PDFs privados, dumps de processamento, `storage/` ou exports SQL.
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `OPENAI_API_KEY`, `SESSION_SECRET` e chaves de webhook ficam somente no provedor.
- Em producao, gere `SESSION_SECRET` com pelo menos 32 bytes aleatorios.
- Para deploy multi-instancia com Server Actions, configure `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.

## Checklist por endpoint

- Autenticacao e autorizacao antes de tocar no dado.
- Limite de tamanho antes de ler corpo/upload.
- Validacao de content-type.
- Mensagem de erro externa generica para falhas internas.
- Logs sem senha, token, cookie ou payload sensivel completo.
- DTO minimo na resposta.

## Storage

Use Supabase Storage para PDFs, imagens de questoes, provas oficiais e materiais
pagos. O fallback em disco local existe para desenvolvimento, mas os artefatos
ficam ignorados no Git para manter o repositorio leve.
