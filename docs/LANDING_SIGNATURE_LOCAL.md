# Landing EstudAki — marca, espaço e conexão

A página pública `/` agora usa uma composição centrada na identidade do EstudAki. A primeira tela começa branca e termina em um degradê azul suave. O símbolo original, o nome da marca e o botão central “Entrar” formam a hierarquia principal. Não há fotografias nem introdução que bloqueie o acesso.

## Composição

1. Marca ampliada, entrada na conta e acesso discreto ao cadastro.
2. “Entender. & resolver.” conecta o símbolo da marca às aulas, questões e revisão. As informações abrem em uma lista interativa, sem grade de cards.
3. Cinco preparações mudam o conteúdo e a cor da prévia. O botão de acesso encaminha ao login com retorno para `/explorar`; a escolha real da preparação acontece na conta, conforme informado na página.
4. “Seu estudo. É Aki.” encerra com acesso e cadastro, além da regra de conta gratuita e aquisição separada de cursos completos.

O símbolo original é apresentado com a máscara já utilizada pelo componente de marca. As fontes são as já instaladas no projeto. Os estilos usam CSS Modules para limitar o efeito à landing.

As animações incluem entrada curta da marca, aparição durante a leitura, troca do conteúdo das preparações, transição da navegação flutuante e respostas ao hover e ao clique. A navegação mantém links nativos. A preferência por movimento reduzido desliga as animações e a rolagem suave. A navegação flutuante fica fora do foco e da árvore de acessibilidade enquanto está escondida.

## Arquivos e escopo

- `src/components/landing/signature-landing-page.tsx`
- `src/components/landing/signature-landing.module.css`
- `src/app/page.tsx`: integração e título; mantém a autenticação e o encaminhamento de usuários conectados ao dashboard.

As duas landings anteriores permanecem no projeto. Não houve publicação, alteração de banco, APIs ou dependências nesta etapa.

## Revisão

Capturas e relatório de navegador: `.codex/landing-signature-review/output/`.

O script `.codex/landing-signature-review/browser.mjs` usa Chrome local, testa sete tamanhos de tela (320, 390, 768, 844, 1024, 1440 e 1920 pixels), inclui celular na horizontal e bloqueia requisições externas. Confere a marca, centralização e visibilidade da entrada, transbordamento, revelação do conteúdo, navegação acessível, acordeão pelo teclado, cinco preparações, movimento reduzido, âncoras e chegada ao formulário de login. A abertura branca também é verificada com o sistema em modo escuro.

Resultado final: 128 verificações passaram, sem erros de execução no navegador. Typecheck e build de produção passaram. O lint terminou sem erros, com os três avisos já existentes nos componentes ReactBits `LogoLoop` e `ProfileCard`. A restauração foi validada em simulação com `-WhatIf`.

## Voltar à versão anterior

Backup desta etapa: `.codex/backups/landing-signature-20261004-225537/`.

Na raiz do projeto, simule:

```powershell
& '.codex/backups/landing-signature-20261004-225537/restore.ps1' -WhatIf
```

Para voltar à landing editorial com fotos:

```powershell
& '.codex/backups/landing-signature-20261004-225537/restore.ps1'
```

O script confere os hashes antes de copiar e interrompe se a página inicial tiver sido alterada posteriormente. Ele restaura a ligação com a landing anterior e seu título. Os componentes novos ficam no disco, sem uso pela página restaurada.
