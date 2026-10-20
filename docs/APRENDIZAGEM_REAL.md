# Perfil, acompanhamento e evolução

O onboarding foi redesenhado em cinco etapas: objetivo, provas e meta, rotina, ponto de partida e revisão. A navegação da plataforma não aparece durante esse fluxo.

## Dados persistidos

StudentLearningProfile guarda objetivo, provas, curso/cargo, meta, data da prova, minutos por dia, dias de estudo, dificuldades declaradas, nível informado, preferências, etapa atual e data de conclusão. O PUT /api/onboarding salva o rascunho; GET lê apenas o perfil da conta autenticada; POST conclui o preenchimento, atualiza a preparação e gera o cronograma. A página restaura o banco, inclusive em outro navegador. O rascunho não depende de localStorage.

O planejamento usa dias e tempo disponíveis, prova, proximidade da data, nível para o tamanho das listas, dificuldades para prioridade inicial e preferências de aulas/leitura quando existe conteúdo publicado acessível. Metas e objetivo são preservados para acompanhamento; não são convertidos em previsão de nota.

Quando não há questões publicadas para a prova escolhida, o sistema não usa questões de outra prova como se fossem equivalentes. Preferências por aulas ou leitura dependem da existência de conteúdo acessível. Diagnóstico e desempenho usam tentativas registradas, sem notas ajustáveis no navegador.

## Professores

O menu de administração inclui Acompanhar alunos, em /professor/alunos. Administradores e coordenadores veem alunos da plataforma. Professores e mentores veem alunos com acesso vigente aos seus cursos/preparações ou atividade nos seus cursos gratuitos. Para cursos pagos, acesso revogado/expirado deixa de autorizar o relatório.

O relatório mostra as escolhas declaradas pelo aluno separadas de acertos, respostas, aulas concluídas, XP e evolução observados. GET /api/teacher/students aplica o mesmo filtro do servidor. Alunos não têm acesso à API; outro professor não pode consultar um aluno sem vínculo. E-mails dos alunos não são enviados ao componente público do ranking.

## XP e sequência

XpAward registra cada crédito com uma chave única por conta e atividade. Respostas, conclusão de aula, revisão, recompensa, simulado e conquista usam transações e bloqueio por aluno. Repetições e chamadas simultâneas não duplicam créditos. Questões respondidas dentro de aulas e simulados também alimentam o histórico de desempenho.

O cronômetro inicia e termina com horários do servidor. A conclusão salva tempo, respostas ocorridas no período e crédito de XP na mesma transação. Cada dois minutos completos valem 1 XP, limitado a 50 por sessão; o tempo registrado é limitado a duas horas. Uma sessão curta pode valer zero XP. O cronômetro registra tempo decorrido; não verifica se a pessoa permaneceu atenta durante todo o intervalo.

Uma conversão única concilia saldos antigos com registros persistidos de aprendizagem e cria o marcador migration:study-ledger-v1. Saldos arbitrários de demonstração são removidos. O script reconcile-study-progress.ts foi executado somente no banco local, com snapshot prévio em .codex. A sequência é calculada a partir dos dias com respostas, aulas concluídas ou sessões encerradas, no fuso America/Sao_Paulo.

## Gráficos e validação

Dashboard e API calculam totais sem os cortes de 240 tentativas e 10 sessões. Dias sem respostas ficam sem medição; zero acertos permanece 0%, sem ser trocado por cumprimento de meta. Contas sem histórico não recebem consistência ou prontidão inventadas. A rotina declarada e a data da prova participam das metas.

56 testes automatizados passaram. verify-real-learning.ts cria e remove fixtures locais e validou perfil, isolamento, planejamento, 251 tentativas, créditos concorrentes, saldo igual ao registro de XP, cronômetro e permissões do professor. A verificação de navegador retomou o perfil em outra sessão, concluiu as cinco etapas, atualizou o gráfico após resposta e abriu o relatório do professor. Capturas e resultados estão em .codex/real-learning-browser-results.json.

A migração 20261002160000_real_learning_profile foi aplicada no banco local. O banco de produção precisa receber as migrações antes do deploy. Estes resultados não comprovam publicação no domínio nem funcionamento dos provedores externos.
