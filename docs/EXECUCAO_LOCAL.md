# Execução local preparada em 24/09/2026

Projeto em `C:\Users\Guilherme\EstudAki`, origin `https://github.com/UaiSilvaz/EstudAkiVestibulares.git`.

**Versão em execução:** EstudAki original, branch local `estudaki-original`, commit `ce294d9` (`chore: backup current production version`). A pedido do usuário, foi selecionada a versão imediatamente anterior ao commit `c4f7b90`, que trocou a interface para Silva Educacional. A branch `main` continua preservada.

## Abrir

- Aplicação: <http://localhost:3000>
- Login: <http://localhost:3000/login>
- Aluno: `aluno@estudaki.com` / `123456`
- Professor, criado pelo seed: `prof@estudaki.com` / `prof123`
- Administrador: `admin@gmail.com` / `Admin@123`

São contas locais de demonstração. O administrador efetivamente criado pelo seed difere daquele descrito no README original. Logins de aluno e administrador foram verificados; professor foi apenas criado pelo seed.

A página inicial, o login e o painel agora usam a interface original do **EstudAki**.

## Ambiente usado

- Node.js 24.14.0 e npm 11.9.0.
- PostgreSQL 18.4 local, restrito a `127.0.0.1:54329`; banco `estudaki`.
- Binários portáteis em `.codex/local-postgres`, instalados via `@embedded-postgres/windows-x64@18.4.0-beta.17` exclusivamente como ferramenta local. Nenhuma dependência foi acrescentada ao `package.json` da aplicação.
- Dados persistidos em `.codex/local-postgres/data`.
- `.env` contém URLs do banco local e segredo de sessão gerado. É ignorado pelo Git.
- Next dev escuta `127.0.0.1:3000` e foi iniciado em segundo plano.

O banco é separado do Supabase. As contas, questões, atividades e cursos são os dados de demonstração do seed. PDFs privados, corpus ENEM, mídia externa e dados de produção não foram baixados nem replicados.

## Retomar nesta máquina

Se os processos já estiverem ativos, basta abrir a URL. Após reiniciar o computador, no PowerShell:

```powershell
cd C:\Users\Guilherme\EstudAki
powershell -ExecutionPolicy Bypass -File .codex/start-local.ps1
```

O helper inicia o banco local existente, se necessário, e executa o servidor de desenvolvimento no terminal. Não reinstala, não recria o banco nem executa seed novamente. O bypass é apenas para essa execução do script local, sem alterar a política global do sistema.

Se o PostgreSQL já estiver ativo, também pode usar:

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Nesse modo, `Ctrl+C` encerra o servidor web. Para encerrar o banco, depois de parar o uso da aplicação:

```powershell
& '.codex/local-postgres/node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe' -D '.codex/local-postgres/data' -m fast stop
```

Não apagar a pasta de dados para encerrar os processos. `.codex` e `.env` são locais e não acompanham um novo clone.

## Preparar um novo clone com PostgreSQL de desenvolvimento

Disponibilizar um banco PostgreSQL vazio de desenvolvimento; copiar `.env.example` para `.env` e ajustar `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` e a URL da aplicação. Configurar Supabase Storage somente se for utilizá-lo; não deixar a URL fictícia do exemplo como serviço real.

```powershell
npm ci
npm run db:generate
npm run db:migrate
node --env-file=.env --import tsx prisma/seed.ts
npx next typegen
npm run dev -- --hostname 127.0.0.1 --port 3000
```

O comando de seed explicita o carregamento de `.env`, necessário nesta execução. Seed insere dados demonstrativos e atualiza determinadas contas: usar somente no banco de desenvolvimento preparado para isso.

Para reproduzir a opção portátil no Windows, os binários podem ser instalados separadamente com:

```powershell
npm install --prefix .codex/local-postgres --no-audit --no-fund @embedded-postgres/windows-x64@18.4.0-beta.17
```

Isso instala apenas os binários. Inicialização do cluster, senha, configuração e criação do banco continuam necessárias; nesta máquina já foram realizadas. Referência do fornecedor: [embedded-postgres](https://github.com/leinelissen/embedded-postgres).

## Alteração mínima para executar

Em `prisma/seed.ts`, foram corrigidos dois identificadores para coincidir com o catálogo atual:

- `policial` → `policia-civil`.
- `militar` → `militares`.

Sem isso, o seed encerrava com `Vertical não encontrada: policial`. O seed corrigido e os dados locais foram mantidos na branch `estudaki-original`. A interface foi recuperada integralmente do commit `ce294d9`. Não houve push, deploy ou migração em banco remoto.

## Evidências e limitações

Evidências da versão EstudAki em `.codex`: `estudaki-verification.json`, `estudaki-home.png`, `estudaki-dashboard.png`, `estudaki-dev.out.log` e `estudaki-dev.err.log`.

Arquivos da análise inicial do commit `c4f7b90`, preservados em `.codex`:

- `build.log`, `lint.log`, `test.log`, `corpus-test.log`.
- `schema-diff.log`: diferenças entre migrações e schema, ainda pendentes.
- `audit-production.json`: relatório npm de dependências.
- `smoke-results.json`: navegação e verificação de autorização.
- `dashboard-desktop.png` e `dashboard-mobile.png`.
- `dev.out.log`, `dev.err.log` e `postgres.log`: logs dos processos.

O build passou. O teste principal teve 41 aprovações e 2 falhas por arquivo de inventário ausente. Existem alertas de dependências e divergências de schema; a análise em [ANALISE_TECNICA.md](ANALISE_TECNICA.md) descreve as prioridades. A execução local confirmada não significa que todos os fluxos estão prontos para produção.
