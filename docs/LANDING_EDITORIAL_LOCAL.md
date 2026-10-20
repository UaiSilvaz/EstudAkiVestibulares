# Landing editorial do EstudAki

A rota pública `/` usa o HTML `estudaki_landingpage_identica_scroll.html` como referência de composição, adaptado ao projeto Next.js. O arquivo original em Documents foi preservado. As telas internas continuam com o redesign anterior.

## O que foi aplicado

- Oito seções: apresentação, conteúdo, diferenciais, preparações, ferramentas, primeiros passos, acesso e dúvidas, chamada final.
- Azul EstudAki, formas amarelas, títulos curtos, fotografias e blocos editoriais próximos ao material enviado.
- Símbolo original em `/brand/estudaki-mark.png` e identidade “EstudAki Preparatórios”.
- Introdução baseada na marca, nos halos e no gradiente conferidos na [versão em produção](https://estudakivestibulares.vercel.app). Aparece uma vez por aba, termina automaticamente e aceita o botão “Pular introdução” ou Escape. A preferência por movimento reduzido dispensa a animação.
- Menu móvel, navegação por seções, barra de progresso, dúvidas expansíveis, modo claro/escuro e seletor de preparações com as cores de cada área.
- Cadastro, entrada e exploração ligados às rotas existentes. Usuários autenticados continuam sendo encaminhados ao dashboard.
- Fotografias do HTML convertidas para WebP local; a landing não depende de requisições a bancos externos de imagens durante o uso.

As fotografias são ilustrativas. Não foram inventados professores, depoimentos, números de alunos ou taxas de aprovação. Os perfis reais podem ser apresentados pela configuração já existente em `src/config/public-faculty.ts`, depois de preenchidos com os dados aprovados. As regras de conta gratuita e compra individual de cursos seguem o modelo já utilizado no projeto.

## Arquivos

- `src/app/page.tsx`: integração da nova landing; mantém autenticação e metadados.
- `src/components/landing/editorial-landing-page.tsx`: conteúdo e interações.
- `src/components/landing/editorial-landing.css`: estilos limitados à landing.
- `src/components/landing/landing-brand-intro.tsx`: introdução da marca.
- `public/assets/landing-editorial/`: fotografias locais e registro das fontes.

Não houve publicação, alteração de banco, migração, mudança nas APIs ou instalação de dependências nesta etapa.

## Verificação local

A revisão de navegador cobre as oito seções, modos claro e escuro e larguras 320, 390, 768, 844, 1024, 1440 e 1920 pixels, incluindo celular na horizontal. Confere transbordamento, imagens visíveis, menu móvel, cores das preparações, dúvidas pelo teclado, navegação, persistência da aparência e ciclo da introdução.

Relatório e capturas ficam em `.codex/landing-editorial-review/output/`. O script de revisão é `.codex/landing-editorial-review/functional-browser.mjs`; usa o Chrome local e o servidor em `http://127.0.0.1:3000`, bloqueando requisições externas.

Resultados desta etapa: 373 verificações de navegador passaram, sem exceções de execução; `npm run typecheck` e `npm run build` passaram. O lint terminou sem erros, com três avisos já existentes nos componentes ReactBits `LogoLoop` e `ProfileCard`. A simulação da restauração com `-WhatIf` também passou.

## Como voltar à landing anterior

Backup: `.codex/backups/landing-editorial-20261004-222236/`.

O script restaura somente a ligação da página inicial com a landing anterior. Os arquivos `premium-landing-page.tsx` e `premium-landing.css` foram preservados integralmente. Os componentes novos permanecem no disco e deixam de ser usados. O script compara os hashes antes de copiar e interrompe se a página inicial tiver sido editada depois desta etapa.

Na raiz do projeto, confira primeiro:

```powershell
& '.codex/backups/landing-editorial-20261004-222236/restore.ps1' -WhatIf
```

Para restaurar:

```powershell
& '.codex/backups/landing-editorial-20261004-222236/restore.ps1'
```

O HTML de referência também está guardado como `referencia-original.html` nesse backup.
