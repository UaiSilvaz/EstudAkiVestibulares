# EstudAki: conta gratuita e compras individuais

Criar conta, confirmar e-mail e entrar não exige pagamento. O plano básico, progresso de estudo, seleção de até 20 questões publicadas/revisadas e simulado demonstrativo de até cinco questões são gratuitos. A seleção do banco é estável, ordenada pela publicação, e exercícios de cursos adquiridos ampliam o conteúdo disponível.

Selecionar ENEM, ETEC, FATEC, OAB, Medicina ou Concursos configura um objetivo gratuito. Isso não concede acesso ao preparatório completo. O catálogo de objetivos e a página de detalhes distinguem plano básico e compra individual.

## Produtos oficiais

Cursos e preparatórios são produtos oficiais EstudAki. Professores trabalham no estúdio de conteúdo; apenas administradores configuram preço/oferta em `/admin/ofertas`. Cursos novos começam como rascunho e não são automaticamente gratuitos. Professores enviam conteúdo para revisão, sem abrir lojas nem configurar ofertas.

O administrador pode configurar um curso gratuito de demonstração ou pago. Um preparatório completo é pago e pode incluir vários cursos, de diferentes professores. Preços são armazenados em centavos, no servidor. Não foram definidos preços novos para os preparatórios ainda não configurados.

Ofertas sem conteúdo publicado, preço ou integração de pagamento prontos aparecem como **Em breve**. Não são criadas cobranças para preparatórios incompletos. Atualizar preço de uma oferta oficial limpa seu identificador AbacatePay; sincronize novamente o produto antes de vender. O identificador antigo não é reutilizado com preço divergente.

## Liberação e estorno

Pagamento pendente não libera conteúdo. Confirmação validada pelo provedor concede permissões persistidas à conta do comprador. Preparatórios adquiridos passam a aparecer nas preparações da conta e liberam os cursos vinculados; comprar um curso individual libera somente esse curso. O checkout impede recomprar conteúdo já liberado e limita cada curso/preparatório a uma unidade por conta.

As permissões respeitam início, expiração e revogação. Estorno, cancelamento ou chargeback revogam a compra correspondente; outras permissões válidas continuam funcionando. Progresso de estudo é preservado. Materiais vinculados às aulas, inclusive recursos PDF explicitamente vinculados, reconhecem o acesso do curso.

A migração `20261003210000_freemium_preparations` desativa acesso integral gratuito automático aos preparatórios ENEM/OAB. Apenas permissões antigas automáticas `free:<preparationId>`, sem compra associada, são revogadas; compras, concessões manuais e outras promoções são preservadas. A autorização também ignora concessões automáticas gratuitas para preparatórios pagos, mesmo que algum registro legado ainda exista.

## EstudAki+

O plano EstudAki+ é apresentado como futuro, sem preço, contratação ou permissões ativas. IA ilimitada, banco ilimitado e estatísticas avançadas são recursos planejados. Cursos comprados individualmente não exigem assinatura EstudAki+.

A Jornada básica mantém seu mapa gratuito e mostra atalhos aos cursos liberados, com progresso persistido desses cursos. O progresso do mapa estático preexistente continua no navegador.

## Validação

`npm run verify` verifica lint, tipos e os 59 testes existentes. `node --env-file=.env --import tsx scripts/verify-freemium.ts` valida o modelo contra banco e servidor locais, com contas e compras sintéticas removidas ao final. O script bloqueia execução contra servidor/banco remoto e não faz cobranças reais.

O teste verifica acesso gratuito, bloqueio sem compra (incluindo preço zero não configurado), isolamento entre cursos, aquisição de preparatório, confirmação idempotente, materiais incluídos, restrições do banco de questões, validade da permissão, estorno e controle de ofertas exclusivo de administradores. Teste de navegador local validou catálogo, seis categorias, detalhe sem cobrança, conclusão do simulado gratuito com progresso persistido e celular sem overflow/erros JavaScript.

Cobrança real depende da conta/chave e produtos AbacatePay configurados, além do webhook. Esta validação não comprova pagamento real nem a existência de aulas/PDFs completos para preparatórios ainda em breve.
