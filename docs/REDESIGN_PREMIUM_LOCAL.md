# Redesign local do EstudAki

A identidade principal agora usa o azul forte da referência, a marca com o símbolo existente e o nome EstudAki Preparatórios. Landing, navegação, dashboard e telas de conta compartilham tipografia, espaçamento, superfícies e ações. O trabalho foi realizado localmente, sem instalar dependências, publicar ou alterar banco e APIs.

## Aplicação

- Landing nova com hero azul, navegação móvel, apresentação interativa das preparações, método, recursos, acesso, perguntas frequentes e CTA final. Os links conduzem aos fluxos existentes.
- Sidebar azul no tema base claro e grafite no escuro; topbar com busca real por assunto, preparação, carrinho, perfil e alternância de aparência. Menus fecham fora e com Escape; o menu móvel mantém foco e bloqueia rolagem enquanto aberto.
- Dashboard com recomendação e meta reais, atalhos, métricas, agenda e gráfico semanal visível. Histórico e atividades complementares ficam recolhidos. Dias sem respostas continuam sem medição.
- Login, cadastro, onboarding, recuperação de senha, confirmação de e-mail e carregamento recebem o mesmo padrão. A aparência é compartilhada e persistida, com suporte à preferência do sistema e a movimento reduzido.
- Cabeçalhos, métricas, botões, cards, campos, estados e ícones compartilhados propagam o padrão para as demais telas, incluindo professor e administração. Regras antigas específicas de OAB que sobrescreviam as paletas foram removidas.
- O seletor de preparação conserva a API existente e mostra uma mensagem recuperável quando a troca falha.

| Preparação | Cor principal clara | Acento escuro |
| --- | --- | --- |
| ENEM e vestibulares | `#2524EB` | `#999DFF` |
| OAB | `#AF2944` | `#F49DAE` |
| Medicina | `#087C73` | `#6AD8C8` |
| Concursos | `#344D83` | `#A9BFF0` |
| Polícia Civil | `#343A46` | `#C6CDD9` |
| Polícia Militar | `#2C3038` | `#CCD0D8` |
| Militares | `#394D52` | `#AACFD0` |

O escuro usa base `#10131C`, superfície `#191E2A` e texto `#EEF1F8`. Botões conservam a cor primária original para permitir texto branco legível; links e detalhes usam o acento claro correspondente.

## Ícones e componentes

Os assets fornecidos continuam em `public/assets/aicons`; matérias, medalhas e ilustrações preservam os desenhos originais. O componente `Aicon` mantém os modos original e temático e acrescenta o modo outline para os controles. O adaptador compartilhado e a navegação usam desenhos vetoriais consistentes da biblioteca já instalada, com espessura uniforme e cor herdada do contexto. Painéis azuis e menus claros usam outline branco; cards usam a cor da preparação. Não foram baixados novos packs.

As animações dos assets originais permanecem limitadas à interação, com poster estático e respeito à preferência de movimento reduzido. Controles outline não solicitam arquivos animados.

Arquivos principais:

- `src/config/vertical-themes.ts`: paletas, aliases e variáveis por preparação/modo.
- `src/app/professional.css`: sistema compartilhado e compatibilidade com as telas existentes.
- `src/components/brand.tsx`: marca reutilizável com o símbolo existente.
- `src/components/landing/premium-landing-page.tsx` e `premium-landing.css`: página pública.
- `src/components/app-shell.tsx`: navegação e topbar.
- `src/components/dashboard/study-focus-panel.tsx`: painel de foco compartilhado com a dashboard real.
- `src/components/account-frame.tsx` e `use-product-appearance.ts`: moldura de conta e aparência compartilhada.

## Professores e credibilidade

Não foram encontrados nomes, fotos e depoimentos aprovados para publicação no material local. Não foram criados professores, resultados de aprovação, testemunhos ou contadores fictícios.

O layout de cards com fotografia, nome, especialidade e descrição está pronto. Para ativá-lo, preencher `src/config/public-faculty.ts` com dados reais aprovados; `photo` deve apontar para uma imagem local em `public`, e `courseHref` para o curso correspondente. Enquanto a lista estiver vazia, a landing apresenta uma seção de cursos funcional. Fotos reais ainda são uma pendência de conteúdo do briefing.

## Validação e limites

- Build de produção concluído e TypeScript aprovado.
- 59 testes principais e 7 testes de carregamento passaram.
- Lint sem erros; permanecem três avisos anteriores de imagens em componentes ReactBits.
- Matriz com 60 combinações de tela, preparação, aparência, perfil e largura, entre 320 e 1440 px, revisada no Chrome local, sem exceções de JavaScript. Inclui páginas públicas reais, telas de conta, gráfico com fixture identificada e componentes reais compartilhados da navegação/dashboard.
- 26 verificações de interação passaram: busca, sidebar recolhida, menus, foco móvel, troca de preparação, falha recuperável, aparência sem storage, movimento reduzido, seleção na landing, FAQ por teclado e validação local do cadastro.
- Textos principais/secundários, links, ações, navegação e descrições do painel foram medidos nos sete temas em ambos os modos; todas essas combinações tiveram contraste de pelo menos 4,5:1. Esta medição não é uma auditoria completa de acessibilidade.
- Uma verificação por posição real dos controles detectou e corrigiu o corte dos CTAs em 320 px, que ficava oculto pelo recorte do hero. Controles da landing foram conferidos em 320, 390 e 768 px após a correção.

A revisão da área autenticada usou uma fixture local explicitamente identificada, sem dados de alunos, para os componentes reais compartilhados. A validação individual de todas as rotas autenticadas e integrações exige uma sessão real e não foi realizada nesta revisão visual.

Aplicativo local: `http://localhost:3000`. Prévia interativa: `http://127.0.0.1:3092/?theme=vestibular&mode=light`. Trocar `theme` ou usar o seletor para comparar preparações; alternar claro/escuro no botão de aparência. Não é uma rota publicada do aplicativo. Para reabrir a prévia:

```powershell
node .codex/redesign-review/build.mjs
node .codex/redesign-review/serve.mjs
```

Capturas e relatórios: `.codex/redesign-review/output/`. Scripts de revisão não fazem parte do produto.

## Voltar à versão anterior

A cópia feita antes desta etapa está em `.codex/backups/redesign-20261004-160910`. Ela inclui o estado local anterior, inclusive alterações que já estavam fora de commits. O manifesto de restauração contém somente os 22 arquivos existentes modificados nesta etapa.

Na raiz do projeto, simular:

```powershell
powershell -ExecutionPolicy Bypass -File ".codex/backups/redesign-20261004-160910/restore.ps1" -WhatIf
```

Restaurar:

```powershell
powershell -ExecutionPolicy Bypass -File ".codex/backups/redesign-20261004-160910/restore.ps1"
```

O script valida todos os hashes e os caminhos antes de copiar. Se houver alterações posteriores, interrompe antes de substituir arquivos. Componentes novos ficam no disco, sem importações nas telas restauradas. Não exclui arquivos e não usa `git reset`. A simulação da restauração foi validada sem modificar o projeto.
