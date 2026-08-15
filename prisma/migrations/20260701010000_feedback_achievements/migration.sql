INSERT INTO "Achievement"
  ("id", "slug", "title", "description", "icon", "color", "xpReward", "criteriaType", "criteriaValue", "status", "createdAt", "updatedAt")
VALUES
  ('feedback-first-today', 'primeira-questao-do-dia', 'O primeiro passo de hoje', 'Você respondeu à primeira questão do dia.', 'sparkles', '#2563EB', 10, 'questions_today', 1, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feedback-daily-ten', 'dez-questoes-no-dia', 'Meta diária concluída!', 'Você resolveu 10 questões no mesmo dia.', 'target', '#22C55E', 30, 'questions_today', 10, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feedback-weekly-fifty', 'cinquenta-questoes-na-semana', 'Semana de alta performance', 'Você resolveu 50 questões nesta semana.', 'flame', '#F97316', 60, 'questions_week', 50, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feedback-review-first', 'primeira-revisao', 'Erro transformado em aprendizado', 'Você concluiu sua primeira revisão.', 'book-open-check', '#A855F7', 20, 'reviews', 1, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feedback-review-five', 'cinco-revisoes', 'Caderno em dia', 'Você revisou cinco questões erradas.', 'clipboard-check', '#7C3AED', 45, 'reviews', 5, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feedback-streak-three', 'sequencia-tres-dias', 'Ritmo criado', 'Você manteve uma sequência de três dias de estudo.', 'flame', '#FACC15', 30, 'streak', 3, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feedback-streak-seven', 'sequencia-sete-dias', 'Uma semana de constância', 'Você manteve uma sequência de sete dias de estudo.', 'award', '#F97316', 80, 'streak', 7, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feedback-accuracy-seventy', 'precisao-setenta', 'Precisão em alta', 'Você alcançou pelo menos 70% de acertos após 10 questões.', 'target', '#22C55E', 50, 'accuracy_10', 70, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feedback-first-simulation', 'primeiro-simulado', 'Modo prova ativado', 'Você finalizou seu primeiro simulado.', 'calendar-check', '#2563EB', 50, 'simulations', 1, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feedback-xp-thousand', 'mil-xp', 'Mil pontos de experiência', 'Você acumulou 1.000 XP na sua jornada.', 'zap', '#FACC15', 75, 'xp', 1000, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "icon" = EXCLUDED."icon",
  "color" = EXCLUDED."color",
  "xpReward" = EXCLUDED."xpReward",
  "criteriaType" = EXCLUDED."criteriaType",
  "criteriaValue" = EXCLUDED."criteriaValue",
  "status" = EXCLUDED."status",
  "updatedAt" = CURRENT_TIMESTAMP;
