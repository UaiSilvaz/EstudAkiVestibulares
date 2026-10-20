# Dados para lançar o EstudAki

Revisão em 03/10/2026. O destino de produção ainda não está configurado. Esta lista complementa [o roteiro de publicação](PUBLICACAO_PASSO_A_PASSO.md).

## Informações que o proprietário precisa fornecer

| Item | Informação necessária | Finalidade |
| --- | --- | --- |
| Domínio | Nome completo comprado, domínio principal e uso de www | HTTPS, links de e-mail e DNS |
| Hostinger | Nome do plano; disponibilidade de Node.js Web Apps ou VPS; existência de site e e-mail atuais | Escolher hospedagem e preservar serviços existentes |
| Hospedagem | Projeto Hostinger ou Vercel, conta proprietária e acesso ao projeto | Publicar a aplicação com servidor Node.js |
| Repositório | Confirmar `UaiSilvaz/EstudAkiVestibulares` e branch de lançamento | Deploy reproduzível e atualizações |
| Banco | Projeto Supabase dedicado; novo ou existente; necessidade de preservar dados | Migrações, usuários e histórico |
| Administrador | Nome e e-mail real com acesso à caixa de entrada | Criar a conta do proprietário e confirmar o endereço |
| E-mail automático | Conta Resend e endereço remetente desejado | Confirmação de cadastro e recuperação de senha |
| Atendimento | E-mail que recebe mensagens, provedor da caixa e WhatsApp correto | Substituir ou confirmar contatos do rodapé |
| Contas existentes | Onde estão os usuários, quem precisa manter acesso e se os e-mails são verificáveis | Planejar migração sem perder contas e progresso |
| Vendas | Gratuito ou pago; AbacatePay ou Hotmart; conta habilitada para produção | Configurar checkout e concessão de acesso |
| Catálogo | Cursos/materiais, preços, acesso gratuito ou pago e duração prometida | Publicar ofertas e associar compras ao conteúdo |
| Conteúdo | Questões revisadas, cursos, vídeos, PDFs e origem dos arquivos | Popular banco e Storage de produção |
| Identificação pública | Responsável pelo serviço e contato; textos de termos, privacidade e regras de compra | Completar as páginas públicas sem inventar informações |
| Operação | Responsável por alertas, orçamento dos serviços e política de backup | Acompanhar falhas e recuperar dados |

Ter domínio não determina onde a aplicação roda. A Hostinger oferece Node.js Web Apps em planos compatíveis; o plano precisa ser identificado antes de escolher o destino. Não contratar outro serviço antes dessa verificação. Referência: [guia oficial da Hostinger](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).

## Segredos: preencher fora do chat

Use `.env.production.local`, já ignorado pelo Git, e depois configure os mesmos valores no ambiente da hospedagem. Não envie o arquivo ao repositório. Não é necessário compartilhar senha pessoal de Hostinger, Google ou banco pelo chat.

| Variável | Onde obter / como usar |
| --- | --- |
| `DATABASE_URL` | Supabase Connect: conexão de runtime com pooler |
| `DIRECT_URL` | Supabase Connect: conexão para migrações |
| `SUPABASE_URL` | URL do projeto Supabase de destino |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privada do projeto para Storage, somente no servidor |
| `NEXT_PUBLIC_APP_URL` | Domínio principal completo com HTTPS |
| `SESSION_SECRET` | Já gerado localmente; preservar e configurar no servidor |
| `RESEND_API_KEY` | Chave do Resend autorizado a enviar pelo domínio verificado |
| `EMAIL_FROM` | Remetente real, por exemplo `EstudAki <nao-responda@SEU_DOMINIO>` |
| `SEED_ADMIN_EMAIL` | E-mail do proprietário |
| `SEED_ADMIN_PASSWORD` | Senha exclusiva de bootstrap, de 12 a 72 bytes; remover após criação |
| `PAYMENT_PROVIDER` | `abacatepay` ou `hotmart`, conforme o lançamento |
| `ABACATEPAY_API_KEY` | Chave do ambiente escolhido; produção antes de abrir vendas |
| `ABACATEPAY_ENV` | `production` para vendas reais |
| `ABACATEPAY_WEBHOOK_SECRET` | Já gerado localmente; cadastrar também no webhook |
| `HOTMART_HOTTOK_SECRET` | Necessário caso o provedor escolhido seja Hotmart |

`OPENAI_API_KEY` é opcional para geração assistida de resoluções. Não é necessária para o login nem para a plataforma básica. Login Google e assinatura recorrente ainda exigem implementação específica; não basta cadastrar chaves.

## E-mails e recuperação

O aplicativo usa autenticação própria com Prisma. O Resend envia confirmação de cadastro e recuperação de senha; uma caixa de entrada de atendimento deve ser configurada no provedor escolhido. O recebimento e processamento de mensagens por webhook do Resend é outro fluxo, não implementado pelo simples envio automático. Referência: [Resend Inbound](https://resend.com/features/inbound).

Preservar os registros MX existentes e aplicar os registros de verificação do remetente exatamente como exibidos pelo provedor. Informar se “resgatar e-mails” significa recuperar senha dos alunos, recuperar acesso a uma caixa antiga ou importar contas existentes: são trabalhos diferentes.

O rodapé atual aponta para `contato@estudaki.com` e um WhatsApp fixo. Confirmar ambos. Os links de termos e privacidade do login atualmente apontam para `#`; precisam de páginas com os dados reais do responsável antes de abrir ao público.

## Sequência de execução após configurar o destino

1. Verificar o projeto de banco e backup; avaliar histórico de migrações se já existir banco.
2. Aplicar migrações no destino, sem reset e sem seed de demonstração.
3. Criar/verificar buckets privados e transferir os arquivos reais. Migrações e deploy não copiam arquivos nem conteúdo automaticamente.
4. Configurar domínio de envio e criar o administrador pelo script `scripts/create-production-admin.ts`, que envia confirmação por e-mail.
5. Publicar conteúdo revisado e configurar ofertas e webhook se houver vendas.
6. Configurar as variáveis na hospedagem, gerar Prisma e fazer o build. Configurar o domínio e HTTPS preservando o e-mail existente.
7. Rodar `npm run production:check` e `npm run storage:check` com as variáveis do destino.
8. Validar no domínio público: cadastro, recebimento e confirmação do e-mail, login, recuperação de senha, onboarding, respostas/progresso persistidos, PDFs/vídeos e isolamento entre contas. Para vendas: compra, acesso, duplicação do webhook e estorno.

O verificador atual exige credenciais AbacatePay quando esse provedor está selecionado, mesmo antes de contar os produtos pagos. Se o lançamento for gratuito, revisar essa exigência e o catálogo antes de liberar; não preencher chaves fictícias.

## Evidência desta revisão

- `npm run verify`: 59 testes passaram, TypeScript passou e lint sem erros, com três avisos de otimização de imagens.
- `npm run security:audit`: zero vulnerabilidades reportadas nas dependências de produção.
- `npm run build`: build de produção concluído com sucesso.
- `npm run production:check`: reprovado por ausência de banco, Storage, remetente/chave Resend, chave AbacatePay e domínio público.
- As integrações externas ainda precisam ser verificadas com as contas reais. Não houve deploy, alteração de DNS ou migração remota nesta revisão.
