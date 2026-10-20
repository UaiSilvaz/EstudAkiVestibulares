# Revisão visual local — 4 de outubro de 2026

O EstudAki passa a usar uma interface sóbria: fundos neutros, bordas discretas, tipografia mais leve, ícones Lucide lineares e ações com uma cor principal. O acabamento comum é carregado pelo layout raiz e alcança as telas públicas, de conta, aluno, professor e administração.

## Preparações

| Preparação | Cor principal | Detalhe contextual |
| --- | --- | --- |
| ENEM e vestibulares | Azul `#1463FF` | Azul petróleo |
| OAB | Navy `#243B59` | Vinho `#8F1D2C` |
| Medicina | Turquesa `#147D87` | Azul profundo |
| Concursos | Navy `#263D58` | Âmbar `#9A772F` |
| Polícia Civil | Azul petróleo `#28485B` | Verde discreto |
| Polícia Militar | Verde institucional `#3E5650` | Âmbar discreto |
| Militares | Azul institucional `#304B6A` | Âmbar discreto |

As paletas permanecem em `src/config/vertical-themes.ts`. O padrão compartilhado está em `src/app/professional.css`. Cores de erro, sucesso e atenção continuam com significado; imagens de cursos, materiais e questões permanecem como conteúdo.

## O que mudou

- Sidebar e matérias usam ícones lineares menores, com espessura consistente. Ícones ilustrados, fundos animados e gradientes por matéria deixam de ser exibidos.
- Cards de métricas ficam neutros, sem ícones repetidos ou decoração. Cabeçalhos são mais compactos.
- Dashboard apresenta próxima ação, plano de hoje e três métricas. Aulas, conquistas, histórico e recomendações ficam em áreas expansíveis.
- Cabeçalhos, cards e utilitários visuais foram ajustados em páginas e componentes existentes, incluindo cursos, questões, simulados, materiais, comunidade, perfil e painéis de gestão.
- Login e página pública acompanham o acabamento. O menu público tem menos opções principais; o menu móvel mantém os destinos existentes.
- Carregamento e conquistas usam feedback simples. A preferência de movimento reduzido é respeitada pelo CSS e Framer Motion.
- Claro/escuro é mantido. As antigas opções de fundos imersivos e ícones coloridos saem da tela de aparência para manter consistência.

## Verificações

- Build local concluído, incluindo geração de 105 páginas estáticas.
- TypeScript sem erros.
- ESLint sem erros; três avisos preexistentes sobre imagens nos componentes ReactBits.
- Suíte principal: 59 testes passaram. Carregamento: sete testes passaram.
- A primeira execução da suíte apresentou uma falha no teste preexistente `rejects a tampered signature`. A execução isolada e a execução seguinte da suíte passaram. Autenticação e esse teste não foram alterados.
- Chrome local: componentes reais em sete temas, claro/escuro, desktop e celular; tablet para OAB. Sem transbordamento horizontal nas páginas de revisão. Contraste dos CTAs entre 4,87:1 e 11,38:1.
- Login e página pública verificados no servidor local em desktop/celular. Troca do formulário para cadastro, abertura/fechamento do menu móvel e expansão por teclado passaram.

Capturas e resultados estão em `.codex/visual-review/output`. As páginas de revisão usam componentes reais, sem dados de alunos e sem autenticação. Elas verificam o acabamento compartilhado, mas não substituem a conferência individual de cada fluxo autenticado com uma sessão real. Nenhuma conta foi criada e nenhum pagamento ou operação de API foi enviado durante essa revisão de navegador. Pedidos do navegador para destinos externos foram bloqueados.

## Reversão

Backup anterior à revisão: `.codex/backups/professional-20261004-110528`.

Na raiz do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File ".codex/backups/professional-20261004-110528/restore.ps1"
```

Para conferir os arquivos antes de restaurar, acrescente `-WhatIf`. Esse modo foi testado sem alterar os arquivos.

A restauração verifica hashes e cancela antes de copiar se detectar edições posteriores, preservando trabalho novo. Ela repõe os arquivos alterados no estado anterior a esta revisão, incluindo as mudanças locais que já existiam. A nova folha `professional.css` permanece como arquivo local sem uso após o layout anterior ser restaurado. Relatórios e capturas também permanecem disponíveis.

Trabalho somente local. Nenhuma publicação, push, alteração de Vercel, domínio, banco ou configuração de produção.
