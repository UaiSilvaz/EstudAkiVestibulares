# Lançamento do MVP — 01/10/2026

O projeto foi validado localmente. Não houve publicação na Vercel, alteração de DNS ou migração de banco remoto nesta execução. O domínio exato, identificação dos projetos e credenciais de produção ainda precisam ser fornecidos/configurados.

## Implementado nesta execução

- Next.js 16.3.8 e Sharp 0.35.5; atualização de dependências transitivas e auditoria sem alertas.
- Migração aditiva para produtos sem material, revogação de licenças e padrão de liga. Índices existentes de conquistas preservados no schema.
- Hotmart v2: identificador do evento e transação aninhada; processamento transacional com trava por compra; duplicação concorrente; falha permite nova entrega; cargos/nome existentes preservados; concessões para cursos/preparações por compra; estorno preserva outras compras; aprovação atrasada não reativa compra estornada.
- Sessões persistidas obrigatórias em produção; logout revoga sessão; compatibilidade com cookie de ID restrita ao ambiente local.
- Vídeos/PDFs do estúdio exigem acesso à aula; licenças revogadas não abrem PDFs. Aulas em rascunho não são publicadas no player. Aulas compartilhadas verificam acesso por todos os cursos associados.
- Imagens novas de redações usam armazenamento privado, normalização de imagem e rota autorizada pelo dono. Imagens públicas antigas precisam de migração caso existam na produção.
- Recuperação de senha com Resend, token aleatório armazenado como hash, expiração de 15 minutos, uso único e revogação de sessões. Envio externo ainda depende de configuração e teste real.
- `/api/health`, verificador de configuração e bootstrap de administrador sem seed de demonstração.

## Configurar ambiente de produção

Crie `.env.production.local` (ignorado pelo Git) a partir de `.env.example`, sem copiar o banco local. Cadastre os mesmos valores na Vercel no ambiente Production. Nunca use prefixo `NEXT_PUBLIC_` em credenciais privadas.

| Variável | Valor necessário |
| --- | --- |
| `DATABASE_URL` | Conexão Supabase de runtime com pooler e credenciais reais |
| `DIRECT_URL` | Conexão direta ou pooler de sessão para migrações |
| `NEXT_PUBLIC_APP_URL` | Domínio final em HTTPS |
| `SESSION_SECRET` | Segredo aleatório de pelo menos 32 bytes |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Projeto e chave privada de Storage |
| `COURSE_MEDIA_BUCKET` | `course-media`, bucket privado |
| `HOTMART_HOTTOK_SECRET` | Segredo do webhook do produto na Hotmart |
| `RESEND_API_KEY` / `EMAIL_FROM` | Chave e remetente de domínio verificado |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Conta do proprietário; senha exclusiva com pelo menos 12 caracteres |

Mantenha `ALLOW_LEGACY_SESSION_COOKIE` e `ALLOW_ENEM_2025_PILOT_TEST` em `false`. Não configure `LOCAL_AUTH_ENABLED` em produção.

Crie buckets privados `exam-pdfs`, `material-pdfs`, `question-images`, `official-exam-files`, `course-media` e `essay-images`. Confira os helpers de armazenamento para outros buckets usados pelo conteúdo cadastrado. Os arquivos privados não são enviados automaticamente pelo Git ou pelo deploy. Faça upload do conteúdo efetivo e valide leitura/autorização no destino.

A aplicação atual usa autenticação própria com Prisma, bcrypt e sessões persistidas. Supabase Auth/Google, Cloudflare Stream/R2 e Sentry do plano anexado ainda não foram integrados; configurar uma variável não substitui essas implementações. Vídeos grandes precisam de upload direto a um provedor: o upload HTTP de até 500 MB existente no estúdio não é adequado aos limites de funções da Vercel.

## Banco e administrador

Com as credenciais do destino configuradas e backup do banco existente:

```powershell
node --env-file=.env.production.local node_modules/prisma/build/index.js migrate status
node --env-file=.env.production.local node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.production.local scripts/bootstrap-production-admin.mjs
node --env-file=.env.production.local scripts/check-launch.mjs
```

Não execute o seed geral em produção: ele inclui contas e conteúdo de demonstração. Não use reset nem `db push --accept-data-loss`. Um banco antigo sem histórico compatível precisa de revisão/baseline antes de aplicar migrações.

O verificador detecta banco local, variáveis ausentes, flags inseguras, senhas de demonstração e produtos pagos sem integração. Não substitui validação de Storage, qualidade do conteúdo nem testes no domínio público.

## Pagamentos e conteúdo

O checkout principal agora está preparado para AbacatePay v2, com Pix, cartão e boleto em compras avulsas. Cursos, materiais vinculados a produtos e carrinho utilizam pedidos associados à conta autenticada. A chave, o catálogo e o webhook reais ainda precisam ser configurados. O caminho Hotmart permanece disponível com `PAYMENT_PROVIDER=hotmart`.

Faça uma compra de teste e confira acesso ao curso, progresso e estorno no ambiente publicado. Na AbacatePay, a conta é vinculada pelo pedido criado pelo servidor; a página de retorno não libera acesso por si só. No caminho Hotmart, a compra deve usar o mesmo e-mail da conta. Assinaturas recorrentes/expiração e mudança de plano ainda exigem implementação específica.

Cadastre e publique apenas aulas, vídeos, PDFs e questões revisados. O corpus oficial ENEM não está presente neste checkout; a fixture adicionada aos testes é sintética e não representa conteúdo disponível aos alunos.

## Vercel e domínio Hostinger

Vincule o projeto Vercel correto ao repositório ou publique este checkout pelo CLI autenticado. `vercel.json` gera Prisma antes do build. Configure Node.js 24, variáveis de ambiente e execute as migrações de forma controlada antes de abrir o tráfego.

Adicione domínio principal e `www` em Settings → Domains na Vercel. Na zona DNS da Hostinger, use exatamente os registros indicados para esse projeto pela Vercel e preserve os registros de e-mail existentes. Não use um IP/CNAME genérico copiado de tutoriais. Valide certificado HTTPS e escolha um domínio canônico.

Referências: [Vercel — domínio personalizado](https://vercel.com/docs/domains/set-up-custom-domain), [Supabase — Prisma](https://supabase.com/docs/guides/database/prisma), [Hotmart — webhook v2](https://developers.hotmart.com/docs/pt-BR/2.0.0/webhook/purchase-webhook/), [Resend — envio](https://resend.com/docs/api-reference/emails/send-email).

## Verificação

```powershell
npm run verify
npm run test:payments
npm run build
npm audit
```

Integração de comércio: `scripts/verify-commerce.ts` exige banco/servidor locais e segredo de teste. Cria e remove somente fixtures próprias. Não envia e-mails nem processa pagamentos reais.

Evidência de navegador local em `.codex/mvp-browser-results.json` e captura mobile em `.codex/mvp-dashboard-mobile.png`. O teste navega pela interface; status HTTP 200 não comprova todos os casos de uso.

Resultados desta execução: 46 testes existentes e 3 testes de payload aprovados; build de produção aprovado; zero alertas no `npm audit`; schema local sem divergência. Integração HTTP validou pagamentos concorrentes, concessão de curso, múltiplas compras, estorno, chargeback, aprovação atrasada, sessão revogada, acesso direto à mídia e recuperação de senha de uso único. O teste de aprendizagem confirmou cronograma com 6 tarefas, conclusão persistida, carrinho/lista de desejos, flashcards, redação e mensagens entre duas contas temporárias. As fixtures foram removidas após os testes.

Pendências materiais: banco/Storage/Vercel de produção e DNS ainda não configurados; Resend sem chave/remetente; checkout real e identificação dos produtos não definidos neste ambiente; conteúdo de produção não importado; Cloudflare Stream/R2 e Supabase Auth/Google ainda não implementados. Não há comprovação de lançamento público nem de um MVP 100% funcional em produção.

## Atualização anterior: onboarding e AbacatePay

O onboarding usa um layout independente, sem a navegação da plataforma, com tema creme/laranja, progresso em sete etapas e retomada local por usuário. Capturas e resultados estão em .codex/onboarding-premium-desktop.png, .codex/onboarding-premium-mobile.png e .codex/onboarding-premium-results.json. O navegador confirmou os sete passos, persistência do objetivo, retomada após recarregar e ausência de erros JavaScript/rolagem horizontal no celular. Também verificou as três opções de pagamento no modal de materiais, fechamento por Escape, erro legível quando o provedor não está configurado e pedido inexistente sem exposição de dados.

São 51 testes automatizados aprovados. O script scripts/verify-abacate-orders.ts usa somente banco local e dados sintéticos: validou rejeição de valor incompatível, pedido pendente sem acesso, confirmação concorrente, deduplicação, acesso ao curso, múltiplas compras, estorno, aprovação atrasada e disputa. O teste Hotmart foi repetido após a extração do serviço compartilhado de concessão de acesso e passou. Esses testes não fizeram chamadas à conta AbacatePay nem processaram pagamentos reais.

Siga [o roteiro de publicação](PUBLICACAO_PASSO_A_PASSO.md) para configurar projetos, chaves, catálogo, webhook, e-mail e DNS. A migração 20261002120000_abacate_checkout foi aplicada apenas no banco local.

## Atualização atual: aprendizagem real

O onboarding anterior foi substituído por cinco etapas, com ícones consistentes, retomada pelo banco e perfil estruturado. Objetivo, rotina, dificuldades e preferências alimentam o planejamento e os relatórios dos professores. Gráficos usam respostas registradas; XP tem um histórico de concessões sem duplicação; o cronômetro mede tempo no servidor. Ranking e diagnóstico não usam competidores ou resultados fictícios.

Os 56 testes automatizados, build de produção e integrações locais de comércio e aprendizagem passaram. Os testes adicionais verificaram concorrência, 251 respostas nas métricas, isolamento dos alunos e revogação de acesso dos professores. O navegador confirmou as cinco etapas, retomada em outra sessão, gráfico atualizado após resposta e relatório do professor.

Veja [os detalhes e limites da aprendizagem real](APRENDIZAGEM_REAL.md). A migração `20261002160000_real_learning_profile` foi aplicada somente ao banco local e precisa ser aplicada na produção antes de publicar esta versão.

## Preparação de produção: e-mail e aulas

Confirmação de e-mail implementada, com links de uso único, hash no banco, expiração e reenvio limitado. Em produção, contas sem confirmação não recebem acesso autenticado. Recuperação de senha confirma a posse do endereço e revoga sessões anteriores. As migrações de confirmação e privacidade foram aplicadas somente no banco local.

O upload do estúdio usa autorização temporária para enviar diretamente ao Storage; tamanho, dimensões das capas e assinaturas de arquivos são verificados pelo servidor. A reprodução remota verifica acesso ao curso antes de redirecionar para um link assinado. Segredos do Supabase não vão para o navegador. O tamanho permitido também depende do plano do Storage.

59 testes passaram, assim como lint sem erros, TypeScript e build de produção. A integração local de e-mail validou bloqueio de login não confirmado, envio simulado, reenvio, confirmação concorrente de uso único, expiração e falha do provedor. O navegador em modo de produção confirmou o endereço no celular, entrou e abriu o dashboard. GET não consome o link de confirmação. As integrações de comércio e AbacatePay passaram para concessão de acesso, duplicação, estorno e chargeback. Nenhum e-mail ou pagamento real foi enviado por esses testes.

`.env.production.local` foi preparado fora do Git com segredos aleatórios. Os campos de banco, Supabase, domínio, Resend e AbacatePay precisam ser preenchidos. A checagem de lançamento detectou esses campos ausentes; não houve migração remota, criação de buckets remotos, deploy ou alteração de DNS. O catálogo e os arquivos precisam ser publicados no banco e Storage de destino conforme [o roteiro](PUBLICACAO_PASSO_A_PASSO.md).
