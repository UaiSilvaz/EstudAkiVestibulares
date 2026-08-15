# Jornada EstudAki - Modelo de Dados

Este modulo foi isolado do banco de questoes para evoluir sem pesar as telas atuais.

## Entidades

- `Subject`: materia principal da Jornada, com icone, cores e texto curto.
- `Path`: trilha macro dentro da materia, por exemplo Matematica Basica.
- `Course`: curso sequencial dentro da trilha, com nivel, objetivos e certificado.
- `Module`: bloco pedagogico dentro do curso.
- `Lesson`: aula com teoria, exemplos, formulas, erros comuns, resumo e atividade.
- `Activity`: exercicio curto de validacao da aula.
- `Source`: fonte usada na curadoria, com licenca, status e atribuicao.
- `Progress`: progresso do usuario por aula e atividade.
- `Certificate`: liberado quando o curso atinge conclusao total.

## Estados editoriais

- `draft`: conteudo criado e aguardando revisao.
- `reviewed`: revisado por humano.
- `published`: liberado para estudantes.

## Persistencia atual

A primeira fase usa dados versionados em `src/lib/jornada-curriculum.ts` e progresso local no navegador. Isso deixa a navegacao imediata e evita criar migracoes antes da revisao pedagogica.

Quando a Jornada sair da fase piloto, essas entidades podem virar tabelas Prisma sem alterar a estrutura das rotas.
