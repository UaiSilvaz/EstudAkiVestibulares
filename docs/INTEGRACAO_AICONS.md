# Ícones fornecidos pelo usuário — integração local

Os dois ZIPs foram tratados como referências e fontes de assets. O HTML e os READMEs dos pacotes não foram executados nem usados como instruções para alterar autenticação, dados ou publicação.

## Arte e aplicação

- Os 38 desenhos e suas versões estáticas/animadas estão em `public/assets/aicons`. Os 64 arquivos com o mesmo nome nos dois pacotes são idênticos; não há cópias duplicadas deles na plataforma.
- `Aicon` usa as imagens fornecidas, sem baixar ícones de terceiros. Menus e cards recebem um tratamento discreto com a cor da preparação e preservação dos detalhes. Matérias e medalhas usam as cores originais.
- O adaptador `aicon-icons.tsx` mantém as propriedades SVG e referências dos componentes substituídos. A integração cobre 68 arquivos de interface, além dos componentes compartilhados de matérias, navegação e botões.
- Setas, carregamento, avisos, controles do player, segurança e ações sem desenho correspondente continuam com ícones funcionais simples.
- ENEM, OAB, Medicina, Concursos e as preparações policiais/militares conservam seus temas próprios. O filtro acompanha as cores claras do modo escuro; ícones em ações escuras recebem tinta clara.
- Cards de acesso receberam tamanho e espaçamento consistentes. Os ícones da página pública foram dimensionados para suas bases, e os detalhes decorativos em verde-limão foram retirados das matérias.
- A seção de método da página pública agora descreve recursos concretos. Foram retiradas estatísticas estáticas sem fonte (`2.000+`, `87%`, `+14%`). A ilustração do painel é identificada como exemplo.
- Botões com link respeitam o estado desabilitado e o evento de clique; a opção de largura completa se aplica ao contêiner. Rótulos administrativos com caracteres quebrados foram corrigidos.

## Animações e carregamento

O primeiro quadro estático aparece desde o início. A versão animada é solicitada apenas ao passar o mouse ou focar o controle pelo teclado, e o quadro estático permanece visível até o carregamento terminar. A animação para em até 2,2 segundos ou ao sair do controle. Preferência por movimento reduzido, controles desabilitados e aba oculta são respeitados. Falhas de carregamento mantêm o quadro estático. Toque não dispara animações decorativas.

Os 38 posters somam aproximadamente 117 KB. Os WebPs animados são mantidos como fornecidos e não são todos carregados na entrada da página.

## Verificação

- Build de produção e TypeScript passaram.
- Suite principal: 59 testes; carregamento: 7 testes, todos passaram.
- Lint sem erros, com os três avisos anteriores de imagens nos componentes ReactBits.
- Revisão em Chrome dos componentes reais dos sete temas: 23 capturas, incluindo celular, tablet e modos claro/escuro, sem rolagem horizontal.
- Testes de interação confirmam carregamento somente na interação, hover, foco, retorno ao poster, duração limitada, movimento reduzido, falha do WebP e link desabilitado. Os 38 posters foram decodificados com sucesso, sem exceções de JavaScript no preview.
- Página pública e login locais revisados em desktop/celular: assets carregados, menu móvel e troca para cadastro funcionando. Essa revisão não substitui a validação individual de todos os fluxos autenticados com uma sessão real.

Preview interativo dos componentes, sem dados de alunos: `http://127.0.0.1:3091`. Não é uma rota pública do aplicativo. Para reabrir: `node .codex/aicons-review/serve.mjs`.

## Desfazer somente esta integração

O estado anterior dos arquivos de interface foi copiado antes das alterações, incluindo trabalho que já estava fora de commits. A restauração não depende de `git reset`.

Na raiz do projeto, simule:

```powershell
powershell -ExecutionPolicy Bypass -File ".codex/backups/aicons-20261004-153651/restore.ps1" -WhatIf
```

Para restaurar:

```powershell
powershell -ExecutionPolicy Bypass -File ".codex/backups/aicons-20261004-153651/restore.ps1"
```

O script verifica os hashes de todos os arquivos antes de copiar. Se detectar trabalho posterior, interrompe sem substituir arquivos. Ele restaura somente arquivos existentes alterados nesta integração; os novos componentes e assets ficam no disco, sem importações nas telas restauradas. Não há exclusão de arquivos nem alteração de banco, API ou produção.
