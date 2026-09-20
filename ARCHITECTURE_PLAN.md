# EstudAki — expansão multiárea

Plano elaborado em 11/09/2026 antes das alterações desta expansão, a partir da especificação do usuário e da inspeção de rotas, componentes, schema, autenticação, compras e motores de estudo existentes.

## 1. Situação atual

- Next.js 16 App Router, React 19, TypeScript, Prisma 6/PostgreSQL, Tailwind 4, Lucide, Framer Motion e GSAP. Permanecem como stack.
- `src/app/(platform)` compartilha autenticação e `AppShell`. Login utiliza cookie assinado, sessões persistidas e permissões STUDENT/TEACHER/MENTOR/COORDINATOR/ADMIN.
- Questões, alternativas, blocos de texto/imagem, tentativas, favoritos, denúncias e revisão já possuem banco e APIs. Há importação de fontes oficiais com revisão/publicação.
- Provas, simulados, redações, flashcards, materiais, comunidade, mensagens, conquistas e sessões de estudo já possuem modelos e fluxos reutilizáveis.
- Materiais são comercializados por `Product`, `Purchase` e `UserProduct`; webhook Hotmart autenticado registra aprovação/estorno. Não substituir essa integração por checkout simulado.
- Dashboard, cronograma e recomendação utilizam tentativas e prioridades. `StudyPlanPreference` é individual e `StudyPlanTask` ainda não separa preparações.
- Jornada/cursos/aulas atuais vêm de `jornada-curriculum.ts`; progresso está no localStorage, sem isolamento por conta. Não há modelos relacionais de curso/aula.
- O visual de referência do repositório foi recuperado; a introdução azul com marca elástica foi integrada a um provider global. A validação visual dessa integração será concluída junto à expansão.

## 2. Problemas a resolver

1. `User.targetExam` é apenas texto; não representa várias preparações nem suas preferências independentes.
2. O onboarding concatena exames e não persiste dificuldades de maneira utilizável pelo plano.
3. Não existem relações N:N de cursos, módulos e aulas, progresso global persistido, anotações nem permissões centrais para esse conteúdo.
4. Regenerar um cronograma remove tarefas futuras incompletas de todo o usuário. É necessário limitar a operação à preparação.
5. Telas de estudo consultam acervo geral; mudanças de objetivo precisam alterar os filtros no servidor, não apenas o título da tela.
6. A licença legada de material mistura acesso e progresso. Um estorno não deve apagar progresso nem revogar outra concessão válida.
7. Salas, revisão espaçada e catálogo multiárea precisam de persistência. Estatísticas, professores, avaliações e disponibilidade jamais serão inventados.

## 3. Arquitetura proposta

Um núcleo: objetivo → preparação do usuário → trilha → tarefas → aulas/questões → progresso → revisão → adaptação.

- Catálogo tipado `educationVerticals` descreve identidade, linguagem, disciplinas e recursos de cada área. Valores persistidos referenciam slugs estáveis.
- Preparações são agrupamentos de conteúdo e recursos. A matrícula/preparação do usuário armazena preferências e seleção de trilha. Comprar e escolher objetivo são operações distintas.
- Um contexto de preparação resolve a escolha persistida, tema, acesso e filtros. É compartilhado por shell, páginas e APIs. `targetExam` permanece compatível com serviços legados.
- Cursos, módulos e aulas possuem identidade própria; joins ordenados permitem reutilização. Concluir uma aula registra uma única conclusão por usuário/aula, utilizada em todos os cursos e preparações.
- `canAccess` centraliza recursos gratuitos, gestão, concessões diretas, produtos, combos, validade e revogação. Inscrição não concede acesso pago.
- Consultas e mutações protegidas verificam usuário, publicação, propriedade, preparação e acesso no servidor. Filtros paginados e índices evitam carregar o acervo inteiro.

## 4. Banco de dados

Migração aditiva, preservando IDs, tabelas e dados existentes:

- `Vertical`, `Preparation`, `UserPreparation` e seleção ativa do usuário.
- `Course`, `CourseModule`, `Lesson`, `ModuleLesson`, `PreparationCourse`, `Track`, `TrackCourse` e relações de autoria. Sem copiar mídia entre produtos.
- `LessonProgress` único por usuário/aula; `LessonNote` com anotação e posição do vídeo; autoria e participação docente informativas, sem execução de repasses.
- `Entitlement` com recurso, origem, validade e revogação; relações produto/preparação/curso para ofertas e combos, preservando compras de materiais.
- Contexto opcional de preparação em tarefas, sessões, redações e comunidade, conforme uso; registro de preferências de plano por preparação.
- `FlashcardReview` único por usuário/card, com estado, intervalo, próxima revisão e histórico agregado.
- `StudyRoom`, membros e mensagens vinculadas à preparação; sessões cronometradas usam sessões de estudo persistidas.

Decisões de compatibilidade: manter a chave de tentativas de simulados existente; não apagar conclusões na revogação; dados legados sem preparação continuam disponíveis e serão associados apenas quando houver identificação segura.

## 5. Migrações e catálogo inicial

1. Validar schema atual e status das migrações antes de aplicar alterações.
2. Gerar SQL aditivo revisável. Não usar reset, `db push --accept-data-loss` nem recriar banco.
3. Gerar Prisma Client e aplicar migração sem remoções de dados.
4. Cadastrar verticais e preparações como metadados reais de organização. Datas de provas, preços, docentes, avaliações e contagens ficam ausentes quando não cadastrados.
5. Importar apenas conteúdo já existente e publicável da jornada, preservando seu identificador e autoria. Catalogar aulas sem inventar vídeos.
6. Migrar progresso local com consentimento explícito do usuário da conta atual, validação dos IDs e merge idempotente; não atribuir silenciosamente o histórico de um navegador compartilhado.

## 6. Componentes e design

- Preservar logo, tipografia, personalidade da versão original, ícones animados, estrutura dos cards e introdução GSAP.
- Tokens semânticos `--primary`, `--secondary`, `--accent`, `--surface`, `--background`, `--muted`, `--border`, `--success`, `--warning`, `--danger`.
- Vestibulares/ETEC mantêm energia e gamificação; OAB/concursos/polícia/militares usam variação sóbria; Medicina usa tons clínicos. Estrutura de navegação é compartilhada.
- Seletor de preparação persistido; menu contextual; busca global acessível com Ctrl/Cmd+K; navegação inferior no celular; shell compacto no tablet.
- Onboarding em etapas com cards animados, prova, data opcional, disponibilidade, nível, dificuldades e experiência; conclusão salva plano antes de abrir dashboard.
- Dashboard prioriza foco do dia, semana, continuar conteúdo e desempenho real. Estados vazios orientam a ação disponível.
- Movimento discreto, foco visível, semântica ARIA, teclado, contraste e `prefers-reduced-motion`; carregamentos utilizam a introdução coordenada sem overlays duplicados.

## 7. Rotas

Reutilizar `/dashboard`, `/onboarding`, `/trilhas`, `/questions`, `/flashcards`, `/simulados`, `/redacao`, `/cronograma`, `/community`, `/perfil`, `/carrinho` e administração existente.

Adicionar/integrar `/preparacoes`, `/preparacoes/[slug]`, `/explorar`, `/cursos`, `/cursos/[slug]`, player por ID de aula, `/caderno-de-erros`, `/progresso`, `/edital`, `/salas`, `/salas/[id]`, `/professores/[id]` e gestão de catálogo. URLs legadas continuam funcionando.

APIs de preparações, seleção ativa, catálogo, conteúdo/progresso/anotações, busca, revisão e salas compartilham autorização e acesso. Compras usam o checkout configurado e confirmação de webhook, nunca um botão que concede compra por conta própria.

## 8. Etapas de implementação

1. **Fundação:** tokens, verticais, modelos/serviços de preparação e acesso, migração.
2. **Personalização:** onboarding, seletor, shell contextual e dashboard com consultas filtradas.
3. **Conteúdo:** cursos/módulos/aulas, player, notas, progresso global, autoria, reuso e catálogo administrativo.
4. **Trilha/plano:** seleção real de trilha, mapa, cronograma separado e adaptação por erros/dificuldades.
5. **Prática:** contexto no banco de questões, caderno de erros, revisão espaçada e criação de flashcards a partir de conteúdo existente.
6. **Avaliações:** integrar simulados/redação existentes ao contexto e preservar registros/limitações reais de correção.
7. **Social:** salas públicas/privadas, Pomodoro e comunidade por preparação.
8. **Loja:** explorar, detalhe de preparação, cursos/combos, contagens do banco, checkout configurado, concessões e revogação.
9. **Gestão:** CRUD de conteúdo reutilizável, professores/autoria, acesso e relatórios com dados persistidos.

## 9. Validação e critérios de entrega

- Prisma validate/generate, ESLint, TypeScript, testes existentes e testes relevantes de isolamento/acesso/progresso/revisão.
- Verificar matrícula e alternância entre duas preparações sem perder tarefas ou progresso; impedir acesso a recursos pagos sem concessão.
- Verificar que uma aula compartilhada aparece concluída em todos os cursos após uma única conclusão e que alteração editorial é única.
- Testar recarga, carregamento lento, navegação repetida, reduced-motion, erro de rede, desktop, tablet e mobile.
- Conferir CRUD → publicação → catálogo → inscrição/acesso → estudo → conclusão → painel; salas/notas/revisão devem persistir entre recargas.
- Entregar apenas ações funcionais; serviços externos sem configuração e conteúdo ainda não cadastrado devem ter estado explícito e não resultados simulados.

## 10. Dependências externas

Vídeos/catálogos de outras áreas, datas oficiais, preços, checkout comercial, credenciais de IA e contratação de correção humana dependem de dados/configurações reais. A implementação deve permitir cadastrá-los e operar com o conteúdo disponível; não inventar essas informações nem efetuar repasses financeiros.
