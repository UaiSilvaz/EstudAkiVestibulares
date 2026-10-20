# Landing EstudAki — composição das duas versões

A página inicial combina a identidade da versão Signature com as fotografias e a composição da versão Editorial. A abertura mantém fundo branco, degradê azul suave, logo ampliada e “Entrar” centralizado. As imagens aparecem nas seções seguintes.

São cinco seções: marca e acesso; apresentação editorial com foto ampla; aulas, questões e revisão; preparações; acesso final. O azul da marca, o branco e o amarelo suave organizam a composição. As cinco áreas mantêm suas cores próprias no seletor e na prévia.

As três fotos são ilustrativas, reutilizadas dos arquivos locais da landing anterior. Não foram apresentados como professores ou alunos reais do EstudAki. O componente Next/Image mantém a otimização e o carregamento sob demanda; as imagens não exigem acesso a bancos externos durante o uso.

A página mantém o acordeão, a navegação flutuante, a rolagem nativa, a barra de leitura, os links reais de acesso e a preferência por movimento reduzido. A autenticação e o encaminhamento dos usuários conectados para o dashboard continuam na página inicial.

## Arquivos

- `src/components/landing/fusion-landing-page.tsx`
- `src/components/landing/fusion-landing.module.css`
- `src/app/page.tsx`: integração da nova landing.

Os componentes Signature e Editorial e seus estilos foram preservados. Não houve publicação, alteração de APIs, banco ou dependências.

## Revisão local

O relatório e as capturas ficam em `.codex/landing-fusion-review/output/`. O script `.codex/landing-fusion-review/browser.mjs` revisa sete tamanhos de tela, incluindo celular na horizontal, imagens visíveis, movimento reduzido, teclado, seletor de preparações e acesso ao formulário de login.

Resultado: 179 verificações passaram, sem erros de execução no navegador. Typecheck e build de produção passaram. O lint terminou sem erros, com os três avisos já existentes em `LogoLoop` e `ProfileCard`. A simulação da restauração também passou.

## Voltar à versão anterior

Backup: `.codex/backups/landing-fusion-20261004-231205/`.

Na raiz do projeto, confira a restauração:

```powershell
& '.codex/backups/landing-fusion-20261004-231205/restore.ps1' -WhatIf
```

Para voltar à versão Signature, sem fotos:

```powershell
& '.codex/backups/landing-fusion-20261004-231205/restore.ps1'
```

O script verifica os hashes e interrompe se a página inicial tiver sido alterada posteriormente. Somente a integração é restaurada. Os componentes novos permanecem no disco, sem uso pela página anterior. A cadeia dos backups anteriores também foi conferida.
