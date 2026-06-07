# EstudAki

EstudAki e uma plataforma educacional inteligente para ajudar estudantes a organizar estudos, praticar questoes, acessar provas antigas, acompanhar desempenho e receber um plano claro do que estudar agora.

## Funcionalidades

- Dashboard inteligente com foco do dia, metas, XP, streak e recomendacoes.
- Banco de questoes com filtros, alternativas, explicacao e registro de tentativas.
- Caderno de erros via filtro de questoes erradas.
- Provas antigas com workspace de anotacoes, marca-texto, caneta, notas, zoom e modo escuro.
- CMS para admins, coordenadores, professores e monitores.
- Editor de questoes com alternativas A-E, tags, status, comentario pedagogico e preview.
- Cadastro de provas antigas, materiais com upload de PDF, preco e link Hotmart.
- Express em formato de feed vertical, com curtir, comentar e salvar por usuario.
- Flashcards, simulados, ranking, desafios e feed de evolucao.
- Banco local SQLite com Prisma.

## Logins de demonstracao

- Aluno: `aluno@estudaki.com` / `123456`
- Professor: `prof@estudaki.com` / `prof123`
- Admin: `admin@estudaki.com` / `admin123`

## Rodar localmente

```bash
npm install
npm run db:generate
npm run db:reset
npm run dev
```

O app roda em `http://localhost:3000`.

## Banco

O SQLite fica em `prisma/dev.db`. O script `npm run db:reset` recria o banco e roda o seed inicial.

> Observacao: o projeto usa um inicializador proprio em `scripts/init-db.mjs` para criar o SQLite a partir do SQL do Prisma, contornando uma falha do schema engine observada no ambiente Windows local.
