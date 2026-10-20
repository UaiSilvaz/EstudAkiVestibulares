# Atualização Vercel — 03/10/2026

## Publicação após configurar Resend

O proprietário verificou o domínio no Resend e salvou `RESEND_API_KEY` e `EMAIL_FROM` em Vercel Production. Novo build concluído e implantação `dpl_8yZqc2dAE9mdqoayZW1v56A1nTbi` promovida com sucesso. Inspeção de `estudakivestibulares.vercel.app` confirmou essa implantação.

- URL pública: https://estudakivestibulares.vercel.app
- Painel: https://vercel.com/uaisilvazs-projects/estud-aki-vestibulares/8yZqc2dAE9mdqoayZW1v56A1nTbi
- Verificação sem autenticação Vercel: `/api/health` HTTP 200 e status ok; `/login`, `/confirmar-email` e `/recuperar-senha` HTTP 200.
- Rotas de confirmação e recuperação responderam HTTP 200 para endereço inexistente, sem enviar e-mail nesse teste.
- Com autorização explícita, foi criada uma conta STUDENT para o e-mail indicado pelo proprietário e enviado o link de confirmação. Cadastro retornou HTTP 202 após aceite do Resend. A entrega na caixa de entrada e a confirmação pelo proprietário ainda precisam ser verificadas.
- A senha temporária gerada para o teste está somente em `.codex/resend-owner-signup.json`, ignorado pelo Git; o proprietário deve definir sua própria senha pelo fluxo de recuperação. Não houve promoção da conta para ADMIN.

O domínio personalizado `.com.br`, pagamentos reais, conteúdo de produção e teste completo de acesso às aulas continuam exigindo configuração/validação. A publicação não comprova todos os fluxos do MVP.

## Estado mais recente: Supabase reativado e migrado

Após o proprietário reativar o projeto Supabase, a conexão passou a responder HTTP 200. O teste de autenticação revelou a coluna ausente `User.emailVerifiedAt` (Prisma P2022).

O histórico de 15 migrações aplicadas foi validado contra os arquivos locais e seus checksums. Foram revisadas e aplicadas as 12 migrações pendentes, de `20260723190000_achievement_catalog_v2` até `20261002181000_private_database_api`, sem reset, seed ou exclusão de contas/respostas. A conexão direta de migrações retornou P1001; a execução usou o pooler de sessão na porta 5432 do mesmo projeto, derivado da conexão de runtime e verificado pelo identificador do projeto.

Nova implantação com banco atualizado: `dpl_9tDQKHoAd657osQSYnBPAaLGpt2z`.

- URL: https://estud-aki-vestibulares-qr6vyvcd8-uaisilvazs-projects.vercel.app
- Painel: https://vercel.com/uaisilvazs-projects/estud-aki-vestibulares/9tDQKHoAd657osQSYnBPAaLGpt2z
- Build remoto concluído com sucesso.
- GET `/api/health`: HTTP 200, `{"status":"ok"}`.
- Login com endereço sintético inexistente passou de HTTP 503/P2022 para HTTP 401 esperado, sem criar conta ou sessão. Não comprova login de um usuário real.
- Cadastro sintético na nova implantação: HTTP 503 com mensagem de envio de confirmação não configurado. Nenhuma conta foi criada.
- `estudakivestibulares.vercel.app` ainda aponta para `dpl_D3LPMJ8heAj3HmbmApjWetB8m6z6`, verificado após a nova implantação.

O proprietário informou que ainda não tem Resend e recebeu o roteiro para criar conta, verificar domínio por DNS e configurar `RESEND_API_KEY` e `EMAIL_FROM` na Vercel Production. A promoção depende dessa configuração e dos testes reais de confirmação/recuperação. A configuração padrão de `vercel.json` foi restaurada após a etapa pontual de migração; futuras atualizações não aplicam migrações automaticamente. O script `scripts/deploy-production-migrations.mjs` permanece como ferramenta de execução explícita com guardas de histórico.

## Histórico da tentativa inicial

Projeto existente: `estud-aki-vestibulares`, equipe `uaisilvazs-projects`.

O workspace atual foi enviado diretamente pela CLI, sem commit/push ou alteração de DNS. Build remoto concluído com sucesso. A publicação usou `--prod --skip-domain` para validar antes de promover.

- Nova implantação: `dpl_Aa1rZ5CSh8QgfHVEzDMDeB6iJWcf`.
- URL: https://estud-aki-vestibulares-frae7e0t4-uaisilvazs-projects.vercel.app
- Painel: https://vercel.com/uaisilvazs-projects/estud-aki-vestibulares/Aa1rZ5CSh8QgfHVEzDMDeB6iJWcf
- GET `/api/health`, com acesso autenticado pela CLI: HTTP 503, `{"status":"unavailable"}`. Isso comprova falha na consulta ao banco, sem determinar sua causa.
- `estudakivestibulares.vercel.app` permanece vinculado à implantação anterior `dpl_D3LPMJ8heAj3HmbmApjWetB8m6z6`, conforme inspeção após o upload.

As seis variáveis existentes em Production são `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` e `NEXT_PUBLIC_APP_URL`. São Secret e o pull retorna placeholders `[SENSITIVE]`; não permite verificar os valores nem aplicar migrações localmente. Não substituir por placeholders.

Resend e pagamentos não estão configurados nas variáveis do projeto. A versão atual exige confirmação de e-mail em produção; não promover antes de configurar envio e verificar banco/migrações. Nenhuma migração remota foi aplicada.

Para concluir: preencher as conexões reais do destino e credenciais necessárias no arquivo privado `.env.production.local`; verificar conexão e histórico de migrações; aplicar as migrações compatíveis; configurar e testar envio de e-mail; validar a nova implantação; promover ao endereço existente. Ver [dados necessários](DADOS_PARA_LANCAMENTO.md).

A CLI vinculou o workspace pelo arquivo ignorado `.vercel/project.json` e criou `.env.local` com configuração de desenvolvimento. Os arquivos privados não foram adicionados ao Git.

## Domínio próprio, validação e preparação de pagamentos

- Domínio https://estudakivestibulares.com.br conectado à Vercel, HTTPS e `/api/health` HTTP 200 verificados. DNS raiz `76.76.21.21`; registros do Resend preservados. `www` redireciona ao domínio raiz com HTTP 308.
- `NEXT_PUBLIC_APP_URL` atualizado para o domínio próprio em Production.
- Banco com 27 migrações aplicadas; seis buckets privados presentes, incluindo `essay-images` e `course-media` criados nesta etapa.
- Conta do proprietário com e-mail confirmado, mantida como STUDENT. A alteração de administrador foi adiada a pedido do usuário.
- Auditoria: 88 flashcards publicados, zero questões publicadas/aprovadas, zero cursos publicados e cinco produtos de apostilas. Conteúdo local de demonstração não foi importado. O usuário adiou conteúdo e priorizou pagamentos.
- Validação com duas contas temporárias isoladas: 33 verificações passaram (autenticação, autorização, isolamento, onboarding, planejamento, cronômetro, APIs, navegação e revogação de sessão). A primeira rodada encontrou espera de transações Prisma/P2028, erros de renderização e timeout no celular; esses resultados não foram considerados aprovação completa.
- Correção: funções configuradas em São Paulo (`gru1`), cliente Prisma compartilhado também em produção e `maxWait` de transações ajustado para 20 segundos. `npm run verify` passou: lint sem erros (três avisos existentes), tipos e 59 testes.
- Implantação corrigida `dpl_BkcHGwjgncCpXgCAKnuNgjnskfnP` promovida. Revalidação real no domínio próprio, celular 390x844: dashboard 3742ms, perfil 2315ms, conquistas 2605ms, compras 1782ms, flashcards 1868ms; HTTP 200, zero erros JavaScript e zero overflow horizontal. Logs da implantação sem erros no intervalo consultado. Evidências locais ignoradas: `.codex/live-mvp-results.json`, `.codex/live-mvp-recheck.json` e `.codex/live-mvp-mobile.png`.
- Pagamentos: `PAYMENT_PROVIDER=abacatepay`, `ABACATEPAY_ENV=production` e segredo aleatório `ABACATEPAY_WEBHOOK_SECRET` configurados em Production. A chave de API ainda não foi fornecida pelo proprietário, e nenhum checkout/pagamento real foi criado. Cadastro/aprovação da conta, chave, webhook no provedor, ofertas de cursos e validação de pagamento/acesso/estorno continuam pendentes.
- O segredo de webhook ficou somente em `.codex/abacate-webhook-private.json` ignorado pelo Git e na Vercel. Não copiar valores secretos para documentação ou chat.
- Referências oficiais consultadas: https://docs.abacatepay.com/pages/authentication e https://docs.abacatepay.com/pages/production.

## Estado final desta etapa

- Duas contas temporárias e seus dados de teste removidos em produção pela implantação de manutenção `dpl_68wHjWBScCyCQYjZjaf8MM54FYr2`; variáveis `MVP_VALIDATION_HASH` e `MVP_VALIDATION_RUN_ID` removidas da Vercel.
- Implantação final normal `dpl_FdaPdNh8GunkpefQdExz3D4JViEH` pronta e promovida ao domínio público, com funções em `gru1`. `vercel.json` mantém build padrão, sem operações de migração ou limpeza automáticas.
- Preparada ferramenta explícita `scripts/configure-abacate-webhook.ts`: consulta configuração e somente cria webhook com `--apply`, sem imprimir segredo/URL privada ou criar pagamentos. Depende da chave e permissões da conta do proprietário; não executada nesta etapa.
- As consultas HEAD dos cinco PDFs no Supabase responderam HTTP 400; a entrega dos arquivos não foi validada. Não atribuir a essa resposta, isoladamente, a conclusão de que os arquivos não existem.
- Não foram comprovados nesta etapa: pagamento real e concessão de acesso, estorno, recuperação de senha com consumo do link, resposta a questões em produção (não há questões aprovadas), entrega de PDFs e aulas. O site está publicado, mas não foi declarado 100% validado.

## Correção de cursos e administrador solicitado

O usuário solicitou explicitamente que a tela online correspondesse ao local e que guilhermeda2009@gmail.com tivesse o maior nível administrativo disponível. A conta anterior guilhermeda2008@gmail.com não foi promovida nem alterada nesta operação.

- Cargo efetivo ADMIN (não existe enum ADMIN_MASTER); conta criada/atualizada com a senha escolhida pelo proprietário armazenada apenas como bcrypt. E-mail marcado confirmado e sessões anteriores da conta alvo revogadas.
- Conta configurada localmente e em produção. Crédito administrativo explícito de 10.000 XP registrado no ledger com origem admin-owner:max-rank, para manter o nível máximo após conciliação. Nenhuma compra fictícia ou conclusão de aula foi registrada.
- Dois cursos locais exportados e sincronizados em transação: Português Redação e Matematica ENEM - Do Zero a Aprovacao. Sete módulos, 35 aulas distintas (36 vínculos), 15 questões autorais locais, 70 vínculos de questões em aulas, duas simulações, duas recompensas, um produto de curso e dependências de conteúdo. Não foram copiados usuários, senhas locais, sessões, compras, tentativas ou progresso de alunos.
- A sincronização conserva os exemplos e descrições de teste existentes no catálogo local; não transforma vídeos de exemplo em aulas reais. Dados de professor para exibição foram preservados no tema visual, sem importar contas de professores.
- Administradores passaram a ter acesso aos cursos pagos e navegação pelas aulas sem bloqueio sequencial. A verificação consulta o cargo persistido no servidor; não depende do e-mail ou de dados enviados pelo navegador. Alunos sem compra e visitantes continuam restritos.
- O texto do catálogo deixou de anunciar checkout demo. Pagamentos reais ainda dependem da chave/configuração AbacatePay.
- npm run verify passou (59 testes e verificação de tipos). ESLint dos arquivos alterados passou sem avisos. Teste de integração local comprovou acesso administrativo às 35 aulas e restrições para visitantes/alunos sem compra.
- Aplicação remota da sincronização: dpl_TDYEBMErAyd6Qyun3h2rbQxhmZ7A. RELEASE_ADMIN_HASH usado pontualmente e removido das variáveis da Vercel depois de confirmar a transação. Configuração padrão de build restaurada.

### Publicação e comparação final

- Implantação final: dpl_7xdRAzC4Awo1wiaxuFcaLv5U3kwh, promovida ao domínio público com build padrão e região gru1.
- Comparação autenticada local/produção: mesmos dois títulos, professores, preços, 35 aulas no curso pago e uma no gratuito. Login da conta solicitada aprovado; role ADMIN e XP >= 10.000 confirmados. API de progresso confirmou acesso e zero nós bloqueados. Acesso à aula final e /api/admin/users aprovado. Desktop e celular sem erros JavaScript e sem overflow horizontal. Evidência: .codex/course-parity-results.json e capturas courses-local/production.
- Biblioteca e catálogo de materiais passaram a reconhecer o acesso administrativo, sem criar compras ou licenças fictícias. Progresso de leitura existente preservado. Testes de biblioteca, página de material e painel /admin passaram localmente e em produção: .codex/admin-library-results.json.
- Alterações finais de biblioteca passaram em typecheck e ESLint; build remoto concluído. Arquivos temporários contendo a senha em texto foram removidos após os testes. A senha não foi documentada nem adicionada ao Git.
- Conteúdo publicado corresponde ao local, inclusive descrições e vídeos de teste existentes. A disponibilidade de todos os PDFs/vídeos reais e os pagamentos permanece separada da validação de acesso realizada aqui.

## Cards administrativos e gestão de contas

- Os cinco cards da visão geral abrem as listas de usuários, questões, provas, materiais e simulados. Contadores consultam o banco; a lista de materiais mostra todos os registros e a nova lista de simulados inclui atividades de cursos.
- Administração de usuários exibe nome, e-mail, cargo, confirmação do e-mail, situação de banimento e detalhes de estudo/compras. Permite promover para professor ou administrador, rebaixar, banir com motivo e desbanir.
- Alterações de cargo e banimento revogam sessões. Banimento impede novos logins; dados e compras são preservados. O servidor impede banir/rebaixar a própria conta administrativa ou deixar o sistema sem administrador ativo.
- Migração 20261003193000_user_ban aplicada localmente e em produção na implantação dpl_73uPQ211cCeHWKetSGVA4CMrbeaL. Build padrão restaurado depois da migração.
- npm run verify passou: tipos, lint (três avisos preexistentes de imagens) e 59 testes. Integração local comprovou mudanças de cargos, banimento, encerramento de sessão, desbanimento, proteção da própria conta, cinco links, busca por e-mail e listagem de simulados. Apenas contas temporárias foram utilizadas e removidas.
- A Jornada atual continua separada da compra dos cursos, com progresso no navegador. Modelo gratuito com aulas/materiais premium vinculados foi explicado como proposta; não foi implementada nova cobrança ou assinatura.
- Implantação final dpl_zoMpEbpUdVdrPtM2Sc98wE53SX8m promovida ao domínio estudakivestibulares.com.br. Teste de integração em produção aprovou promoção/rebaixamento, banimento/desbanimento, proteção da própria conta, cinco cards, busca por e-mail e lista de simulados. Evidências: .codex/admin-controls-local.json e .codex/admin-controls-production.json. Contas temporárias removidas; script temporário com credencial de teste removido. A revogação de uma sessão já aberta foi comprovada no teste local.

## Separação de professores e administração

- Ícone próprio de professor diante de um quadro. ADMIN recebe menus Professores e Administração; TEACHER recebe somente Professores entre as áreas de gestão, e STUDENT não recebe esses menus. Desktop e celular verificados em navegador.
- Novas páginas `/professor` e `/professor/cursos`; acompanhamento em `/professor/alunos`. Professor cria e edita conteúdo autorizado, envia publicações para revisão e acompanha alunos vinculados. Gestão geral e ofertas exigem ADMIN no servidor.
- Estúdio filtra cursos, módulos e aulas por responsabilidade/autoria e impede edição ou vinculação não autorizada de conteúdo de terceiros.
- Migração `20261003223000_teacher_roles` aplicada localmente e em produção pela implantação `dpl_J5REiTJozAJsepoZQAWPz8T72z53`. Mentor/Coordenador passam a Professor, com sessões antigas encerradas. Enum final tem apenas STUDENT, TEACHER e ADMIN.
- `npm run verify` aprovado: tipos, lint sem erros e 59 testes. Integração de permissões e regressão freemium aprovadas; contas de teste removidas. Guia em `docs/PROFESSORES.md` e evidência de menus em `.codex/teacher-ui-local.json`.
- Implantação final `dpl_7HXyHkttnD6H3riPpJ1jCYfwwj8a` pronta e promovida ao domínio público, com build padrão e funções em gru1. Navegador autenticado confirmou painel/estúdio, ambos os menus ADMIN, três cargos nas contas, navegação mobile e ausência de erros JavaScript. Evidência sanitizada em `.codex/teacher-ui-production.json`; script temporário com credencial removido.

## Modelo freemium com cursos oficiais

- Conta e plano básico gratuitos. Banco demonstrativo com até 20 questões, simulado gratuito de até cinco questões e progresso persistido de respostas. Cursos/preparatórios completos são compras individuais, sem assinatura obrigatória.
- Catálogo inclui ENEM, ETEC, FATEC, OAB, Medicina e Concursos. Selecionar objetivo não concede acesso ao preparatório pago. Ofertas sem conteúdo publicado ou pagamento configurado aparecem como Em breve.
- Novo `/admin/ofertas` configura preços e cursos incluídos em preparatórios, exclusivamente para ADMIN. Cursos novos começam em rascunho; professores não abrem lojas nem configuram ofertas comerciais. EstudAki+ apresentado apenas como futuro, sem contratação.
- Aprovação concede acesso somente ao curso/preparatório correspondente; preparatórios liberam seus cursos vinculados e materiais das aulas. Validade, estorno e permissões independentes preservadas. Checkout bloqueia recompra, quantidade múltipla e curso sem conteúdo publicado.
- Biblioteca deixou de arquivar indiscriminadamente produtos e materiais fora dos cinco PDFs iniciais, protegendo ofertas oficiais de cursos.
- Migração 20261003210000_freemium_preparations aplicada localmente e em produção na implantação dpl_C7oBUhFPJA4q7U4SmKHy6q1mMKcP. Só concessões automáticas gratuitas antigas de ENEM/OAB foram revogadas; compras e concessões explícitas preservadas. Autorização também ignora concessões automáticas gratuitas em preparatórios pagos.
- npm run verify passou (59 testes); integração local scripts/verify-freemium.ts comprovou isolamento, confirmação idempotente, validade, estorno, materiais, questões, curso vazio sem cobrança e ofertas exclusivas de ADMIN. Contas/compras sintéticas removidas. Teste de navegador local aprovou conclusão do simulado gratuito com progresso persistido.
- Navegador em produção aprovou landing, seis categorias oficiais, detalhes, formulário administrativo de ofertas e catálogo mobile sem overflow/erros JavaScript. Evidências .codex/freemium-ui-local.json e .codex/freemium-ui-production.json.
- ABACATEPAY_API_KEY ainda ausente na Vercel Production. Recebimento real continua dependendo da chave, sincronização das ofertas e webhook; preços/conteúdo dos novos preparatórios não foram inventados. Detalhes operacionais em docs/MODELO_FREEMIUM.md.
- Implantação final dpl_55uTAJkcrhzcyCpruiJDpdTEMKSp pronta e promovida ao domínio público. Conferência de navegador repetida após a proteção final de permissões legadas, com todos os checks aprovados. Build padrão e funções em gru1 mantidos. Script temporário de navegador com credencial removido; evidências sanitizadas preservadas.
