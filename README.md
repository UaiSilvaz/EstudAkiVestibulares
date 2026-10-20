# Norte Preparatórios

Norte Preparatórios é uma plataforma para organizar estudos, praticar questões, acessar provas antigas, acompanhar desempenho e receber um plano claro do que estudar agora.

## Funcionalidades

- Dashboard inteligente com foco do dia, metas, XP, streak e recomendações.
- Banco de questões com filtros, alternativas, explicação e registro de tentativas.
- Caderno de erros via filtro de questões erradas.
- Provas antigas com workspace de anotações, marca-texto, caneta, notas, zoom e modo escuro.
- CMS para admins, coordenadores, professores e monitores.
- Editor de questões com alternativas A-E, tags, status, comentário pedagógico e preview.
- Cadastro de provas antigas, materiais com upload de PDF, preço e link Hotmart.
- Express em formato de feed vertical, com curtir, comentar e salvar por usuario.
- Flashcards, simulados, ranking, desafios e feed de evolução.
- Backend com Prisma, PostgreSQL/Supabase, dashboards, métricas, conquistas, usuários e sessões de estudo.

## Logins de demonstracao

- Aluno: `aluno@estudaki.com` / `123456`
- Professor: `prof@estudaki.com` / `prof123`
- Admin: `admin@estudaki.com` / `admin123`

## Rodar localmente

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

O app roda em `http://localhost:3000`.

## Backend e banco

O projeto está preparado para PostgreSQL com Supabase via Prisma.

1. Copie `.env.example` para `.env`.
2. No Supabase, pegue a URL pooled para `DATABASE_URL`.
3. Pegue a URL direta para `DIRECT_URL`.
4. Rode:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Scripts úteis:

- `npm run db:generate`: gera o Prisma Client.
- `npm run db:migrate`: aplica migrations no banco remoto.
- `npm run db:migrate:dev`: cria/aplica migrations em desenvolvimento.
- `npm run db:push`: sincroniza schema sem migration formal.
- `npm run db:seed`: popula dados iniciais.
- `npm run db:studio`: abre o Prisma Studio.

## APIs principais

- `GET /api/dashboard`: dados completos do aluno, métricas, recomendações, atividades, vídeos, conquistas e sessões.
- `GET /api/metrics`: resumo de métricas e insights.
- `GET /api/achievements`: conquistas sincronizadas por usuario.
- `GET /api/study-sessions`: lista sessões de estudo.
- `POST /api/study-sessions`: registra sessao de estudo.
- `GET /api/users/me`: perfil do usuario logado.
- `PATCH /api/users/me`: atualiza perfil, horas semanais e vestibular alvo.
- `GET /api/admin/users`: lista usuários para gestores.
- `POST /api/admin/users`: cria usuario para gestores.

## Dados necessarios para Supabase

Para conectar o banco real, informe:

- `DATABASE_URL` pooled do Supabase.
- `DIRECT_URL` direta do Supabase.
- Senha do banco ou string completa ja com senha.
- Regiao/host do projeto se a URL pooled não vier pronta.
