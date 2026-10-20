# Landing EstudAki — tipografia, cor e vidro

A rota pública `/` usa uma nova direção inspirada nas três imagens enviadas: azul intenso, tipografia ampla, acentos verdes e vermelhos, faixa editorial em movimento e painéis de vidro. O símbolo original “&” aparece no logo, nos elementos gráficos e nas transições entre conteúdo e prática.

A abertura mantém “Entrar” centralizado. O painel de vidro é um link para os cursos. Nas seções seguintes, o seletor Entenda / Pratique / Revise muda a fotografia e o texto; o seletor de preparações muda a cor e o conteúdo da prévia. Os acessos usam as rotas existentes de login, cadastro, cursos e exploração.

## Referências e decisões

- As imagens enviadas orientam a composição, a escala das letras, o vidro sobre formas verdes e os detalhes vermelhos. Não foram inseridas capturas de outros sites dentro da página.
- [Invisible North no Awwwards](https://www.awwwards.com/sites/invisible-north): referência consultada de identidade, tipografia durante a rolagem, transições e microinterações.
- [MDN — backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter): transparência, desfoque e funcionamento das camadas do vidro. Há tratamento alternativo com superfícies sólidas em navegadores sem suporte.
- [MDN — animações de rolagem](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations/Timelines) e [movimento reduzido](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion): referências técnicas para movimento e preferência do usuário.

A implementação usa CSS Modules, IntersectionObserver para revelar conteúdo e requestAnimationFrame para deslocamentos discretos durante a rolagem. A rolagem permanece nativa. O desfoque fica limitado aos painéis, etiquetas e navegação; não há filtro sobre toda a página. A animação contínua da faixa pode ser pausada pelo botão no cabeçalho, que também desliga os outros efeitos. Movimento reduzido desliga entrada, faixa e parallax.

As três fotografias são ilustrativas e reutilizam WebP locais da versão anterior, com Next/Image. Nenhum professor, resultado, depoimento ou estatística foi inventado. Os estilos novos ficam limitados à landing. Não houve instalação de dependências, alteração de banco, APIs ou publicação.

## Arquivos e revisão

- `src/components/landing/glass-landing-page.tsx`
- `src/components/landing/glass-landing.module.css`
- `src/app/page.tsx`: integração, preservando a autenticação.

Relatório e capturas em `.codex/landing-glass-review/output/`. O script `.codex/landing-glass-review/browser.mjs` usa Chrome local e verifica sete tamanhos de tela, incluindo celular na horizontal, centralização e visibilidade do acesso, vidro aplicado, fotos, navegação, escolhas por teclado, preparações, pausa de animações, movimento reduzido e chegada ao formulário de login.

Resultado final: 186 verificações passaram, sem erros de execução no navegador. Typecheck e build passaram. O lint terminou sem erros, com os três avisos anteriores em `LogoLoop` e `ProfileCard`. A simulação da restauração também passou.

A versão compilada foi aberta em um servidor local temporário e verificada separadamente: renderização das cinco seções no servidor, desfoque dos painéis, pausa de animações, layout do celular e ausência de erros de execução. O servidor temporário foi encerrado após essa conferência. Relatório: `.codex/landing-glass-review/output/production-report.json`.

## Voltar à versão anterior

Backup: `.codex/backups/landing-glass-20261004-233055/`.

Na raiz do projeto, simule:

```powershell
& '.codex/backups/landing-glass-20261004-233055/restore.ps1' -WhatIf
```

Para restaurar a landing Fusion:

```powershell
& '.codex/backups/landing-glass-20261004-233055/restore.ps1'
```

O script confere hashes antes de copiar e interrompe se houver alterações posteriores. As versões anteriores permanecem no projeto; a restauração apenas reconecta a página inicial à versão Fusion.
