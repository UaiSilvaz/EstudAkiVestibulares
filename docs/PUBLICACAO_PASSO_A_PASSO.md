# Publicação do EstudAki

## 1. Identificar os projetos

Informe o domínio comprado na Hostinger, o nome/link do projeto Vercel e o link do projeto Supabase. Não envie senhas pelo chat. As configurações privadas podem ficar em `.env.production.local`, que deve permanecer fora do Git.

## 2. Supabase e acesso

Copie as conexões do painel Connect do Supabase: `DATABASE_URL` para o aplicativo e `DIRECT_URL` para as migrações, conforme [o guia oficial de Prisma](https://supabase.com/docs/guides/database/prisma). Configure também `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no servidor. Gere `SESSION_SECRET` aleatório de pelo menos 32 bytes.

O login atual do EstudAki usa usuários e sessões persistidos via Prisma; configurar um projeto Supabase não muda automaticamente o login para Supabase Auth ou Google.

Execute `node scripts/prepare-production-env.mjs` para preparar o arquivo privado de configuração. Ele já foi criado neste ambiente com segredos aleatórios de sessão e webhook; preencha os campos vazios. Os segredos não aparecem no terminal.

Antes das migrações, confirme que o projeto é o destinado ao EstudAki. Aplicar as migrações altera o banco de destino. Execute usando as variáveis de produção:

```powershell
node --env-file=.env.production.local node_modules/prisma/build/index.js migrate deploy
```

Crie os buckets privados exigidos pelo aplicativo: `exam-pdfs`, `material-pdfs`, `question-images`, `official-exam-files`, `course-media` e `essay-images`. Confira também o armazenamento de avatares nas configurações existentes. Não copie contas com senhas de demonstração para produção.

Após configurar o projeto, execute `node --env-file=.env.production.local scripts/setup-supabase-storage.mjs --apply`. O script cria os buckets usados pela configuração e torna privados os existentes. Sem `--apply`, apenas verifica. As tabelas do aplicativo são acessadas pelo servidor via Prisma; a migração de privacidade remove acesso direto dos papéis `anon` e `authenticated` do Supabase às tabelas públicas. Use um projeto dedicado ao EstudAki.

## 3. AbacatePay

Crie a chave de sandbox no painel AbacatePay e configure `ABACATEPAY_API_KEY`, `ABACATEPAY_ENV=sandbox` e `PAYMENT_PROVIDER=abacatepay`. Para testes locais, use `.env`. Gere um segredo privado para `ABACATEPAY_WEBHOOK_SECRET`.

Publique os produtos com preços definitivos e seus vínculos aos cursos/preparações. Rode `npm run payments:sync` no ambiente de teste para cadastrar as ofertas no provedor. O script cria produtos, sem realizar cobranças. A implementação usa [checkout hospedado v2](https://docs.abacatepay.com/pages/payment/create), com Pix, cartão e boleto, sujeito à disponibilidade na sua conta.

Configure no painel o webhook HTTPS:

```text
https://SEU_DOMINIO/api/webhooks/abacatepay?webhookSecret=SEU_SEGREDO
```

Ative os eventos de conclusão, reembolso e disputa disponíveis na conta. A rota exige o segredo privado e a assinatura HMAC do corpo original, e consulta o checkout na API antes de conceder acesso. Veja [a segurança de webhooks](https://docs.abacatepay.com/pages/webhooks/security).

No sandbox, teste compra, acesso ao curso, página de confirmação e estorno. Depois, configure a chave de produção e `ABACATEPAY_ENV=production`, e sincronize novamente o catálogo contra o banco de produção:

```powershell
node --env-file=.env.production.local --import tsx scripts/sync-abacate-products.ts
```

Os identificadores de produtos devem pertencer ao mesmo ambiente da chave. O suporte implementado é a compra avulsa; assinaturas recorrentes exigem outro fluxo.

## 4. E-mail

Configure `RESEND_API_KEY` e `EMAIL_FROM` com domínio verificado para confirmação de e-mail e recuperação de senha. Use os registros DNS informados pelo Resend, preservando os registros de e-mail já existentes na Hostinger. O envio usa [a API oficial do Resend](https://resend.com/docs/api-reference/emails/send-email).

Em produção, cadastro e login exigem endereço confirmado. O cadastro envia um link válido por uma hora; `/confirmar-email` permite confirmar ou reenviar. Tokens são armazenados apenas como hash, têm uso único e reenvio limitado. Contas existentes também precisam confirmar o endereço; não são marcadas como verificadas pela migração. Recuperação de senha usa link de 15 minutos, confirma a posse do e-mail e revoga as sessões anteriores.

Para criar o primeiro administrador em um banco novo, configure temporariamente `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` (senha exclusiva com pelo menos 12 caracteres) no arquivo privado e execute `node --env-file=.env.production.local --import tsx scripts/create-production-admin.ts`. O script não promove nem sobrescreve contas existentes. Confirme o e-mail recebido e retire a senha de bootstrap das variáveis.

## Aulas e arquivos

O estúdio envia capas, PDFs e vídeos diretamente para o Storage por autorização temporária. O servidor verifica tamanho, formato e dimensões antes de devolver o endereço de uso. Em desenvolvimento sem Storage, permanece o upload local. A reprodução remota verifica o acesso ao curso e redireciona para um link assinado válido por uma hora; o vídeo e as requisições Range passam pelo Storage. O limite efetivo de tamanho depende do plano Supabase, além dos limites do aplicativo.

Publique cursos com módulos e aulas reais, vídeos disponíveis e materiais revisados. Migrações criam estrutura, sem copiar o catálogo e os arquivos locais. Não execute o seed de demonstração no banco de produção. Antes de abrir vendas, confira um curso gratuito e um pago com contas distintas, incluindo bloqueio de quem não comprou e perda do acesso após estorno.

## 5. Vercel e domínio

Vincule o projeto correto, configure as variáveis privadas em Settings → Environment Variables e `NEXT_PUBLIC_APP_URL=https://SEU_DOMINIO`. O arquivo `vercel.json` já prevê geração do Prisma e build. As migrações são uma etapa separada.

Adicione o domínio e `www` em Settings → Domains. Na Hostinger, configure exatamente os registros exibidos pela Vercel para esse projeto, seguindo [o guia oficial](https://vercel.com/docs/domains/set-up-custom-domain). Preserve MX e TXT existentes. Verifique HTTPS e redirecionamento para o domínio principal.

## 6. Abrir ao público

Execute a checagem com as variáveis de destino:

```powershell
node --env-file=.env.production.local scripts/check-launch.mjs
```

Valide cadastro, login, onboarding, recuperação de senha, checkout sandbox, confirmação, curso protegido e estorno no domínio publicado. Revise o conteúdo liberado aos alunos. Esta checagem não comprova o funcionamento dos buckets nem substitui testes reais de pagamento.

Até concluir essas etapas, o projeto está preparado localmente, mas não lançado em produção.
