# Professores do EstudAki

Há três cargos: Aluno, Professor e Administrador. Não há cargos Mentor ou Coordenador; a migração converte contas antigas desses cargos para Professor e encerra suas sessões antigas.

O professor usa o mesmo login da plataforma. O administrador promove a conta em **Administração → Usuários**. Depois da promoção, o professor acessa **Professores**, com ícone próprio de professor diante de um quadro:

- **Painel do professor**: seus cursos e cursos aguardando revisão.
- **Cursos, módulos e aulas**: criação e edição do conteúdo sob sua responsabilidade.
- **Acompanhar alunos**: alunos vinculados aos seus cursos, incluindo acessos válidos pelos preparatórios oficiais.

O administrador vê os menus **Professores** e **Administração**. O professor vê somente **Professores** entre os menus de gestão; continua com acesso aos recursos comuns da plataforma. O aluno não vê nenhum desses menus.

Professor não gerencia usuários, cargos, bloqueios, preços, ofertas, fontes oficiais, acervo geral ou configurações administrativas. Essas restrições são verificadas no servidor, inclusive quando alguém tenta abrir a URL ou chamar a API diretamente.

Cursos novos começam como rascunho e não são gratuitos automaticamente. A tentativa do professor de publicar um curso ou aula envia o conteúdo para **Revisão**. O administrador aprova a publicação e configura a oferta oficial. Cursos continuam sendo produtos do EstudAki, sem marketplace aberto.

O professor não pode editar cursos de outro responsável, vincular módulos de terceiros ou reutilizar aulas às quais não tem permissão. Aulas com autoria explicitamente atribuída ao professor continuam disponíveis para sua edição; módulos compartilhados com cursos de outros responsáveis exigem administrador.

Verificação local: `npx tsx --env-file=.env scripts/verify-teacher-permissions.ts`. O teste cria contas temporárias, verifica permissões e isolamento, e limpa os dados ao terminar. Só executa contra servidor e banco locais.
