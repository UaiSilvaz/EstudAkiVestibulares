export type RouteLoadingMeta = {
  label: string;
  from: string;
  to: string;
  accent: string;
};

const defaultMeta: RouteLoadingMeta = {
  label: "Abrindo Silva Educacional",
  from: "#2563EB",
  to: "#22D3EE",
  accent: "#FACC15",
};

const routeMeta: Array<[RegExp, RouteLoadingMeta]> = [
  [/^\/dashboard(?:\?|$)/, { label: "Abrindo Inicio", from: "#2563EB", to: "#22D3EE", accent: "#86EFAC" }],
  [/^\/cronograma(?:\?|$)/, { label: "Abrindo Meu Plano", from: "#F97316", to: "#FACC15", accent: "#2563EB" }],
  [/^\/trilhas(?:\?|$)/, { label: "Abrindo Jornada", from: "#7C3AED", to: "#22D3EE", accent: "#FACC15" }],
  [/^\/questions(?:\?|$)/, { label: "Abrindo Banco de Questoes", from: "#0EA5E9", to: "#2563EB", accent: "#F97316" }],
  [/^\/simulados(?:\?|$)/, { label: "Abrindo Simulados", from: "#EA580C", to: "#FB7185", accent: "#FACC15" }],
  [/^\/flashcards(?:\?|$)/, { label: "Abrindo Flashcards", from: "#16A34A", to: "#22C55E", accent: "#2563EB" }],
  [/^\/redacao(?:\?|$)/, { label: "Abrindo Redacao", from: "#DB2777", to: "#F97316", accent: "#FACC15" }],
  [/^\/biblioteca(?:\?|\/|$)/, { label: "Abrindo Biblioteca", from: "#9333EA", to: "#2563EB", accent: "#22D3EE" }],
  [/^\/materials(?:\?|$)/, { label: "Abrindo Materiais", from: "#0891B2", to: "#22C55E", accent: "#FACC15" }],
  [/^\/provas(?:\?|\/|$)/, { label: "Abrindo Provas", from: "#1D4ED8", to: "#7C3AED", accent: "#F97316" }],
  [/^\/provas-antigas(?:\?|\/|$)/, { label: "Abrindo Provas Antigas", from: "#0F766E", to: "#2563EB", accent: "#FACC15" }],
  [/^\/performance(?:\?|$)/, { label: "Calculando Desempenho", from: "#4F46E5", to: "#06B6D4", accent: "#22C55E" }],
  [/^\/ranking(?:\?|$)/, { label: "Abrindo Ranking", from: "#F59E0B", to: "#F97316", accent: "#2563EB" }],
  [/^\/conquistas(?:\?|$)/, { label: "Abrindo Conquistas", from: "#CA8A04", to: "#F97316", accent: "#22D3EE" }],
  [/^\/community(?:\?|$)/, { label: "Abrindo Comunidade", from: "#0D9488", to: "#22C55E", accent: "#FACC15" }],
  [/^\/aulas(?:\?|$)/, { label: "Abrindo Aulas", from: "#06B6D4", to: "#2563EB", accent: "#FACC15" }],
  [/^\/cursos(?:\?|$)/, { label: "Abrindo Cursos", from: "#7C3AED", to: "#2563EB", accent: "#22D3EE" }],
  [/^\/videos(?:\?|\/|$)/, { label: "Abrindo Videos", from: "#DB2777", to: "#7C3AED", accent: "#FACC15" }],
  [/^\/aula(?:\?|\/|$)/, { label: "Abrindo Aula", from: "#2563EB", to: "#16A34A", accent: "#FACC15" }],
  [/^\/revisoes(?:\?|$)/, { label: "Abrindo Revisoes", from: "#16A34A", to: "#0EA5E9", accent: "#F97316" }],
  [/^\/certificados(?:\?|$)/, { label: "Abrindo Certificados", from: "#CA8A04", to: "#F59E0B", accent: "#2563EB" }],
  [/^\/compras(?:\?|$)/, { label: "Abrindo Compras", from: "#F97316", to: "#EA580C", accent: "#FFFFFF" }],
  [/^\/atividade(?:\?|$)/, { label: "Abrindo Atividade", from: "#0F766E", to: "#22C55E", accent: "#FACC15" }],
  [/^\/salas(?:\?|\/|$)/, { label: "Abrindo Salas de Estudo", from: "#0F766E", to: "#0891B2", accent: "#FACC15" }],
  [/^\/explorar(?:\?|$)/, { label: "Abrindo Explorar", from: "#EA580C", to: "#2563EB", accent: "#FACC15" }],
  [/^\/preparacao(?:\?|$)/, { label: "Abrindo Preparacao", from: "#2563EB", to: "#16A34A", accent: "#F97316" }],
  [/^\/preparacoes(?:\?|$)/, { label: "Abrindo Preparacoes", from: "#2563EB", to: "#16A34A", accent: "#F97316" }],
  [/^\/estudar(?:\?|$)/, { label: "Preparando Estudo Agora", from: "#16A34A", to: "#22C55E", accent: "#FACC15" }],
  [/^\/radar(?:\?|$)/, { label: "Abrindo Radar da Prova", from: "#0F172A", to: "#2563EB", accent: "#F97316" }],
  [/^\/edital(?:\?|$)/, { label: "Abrindo Edital Inteligente", from: "#334155", to: "#0EA5E9", accent: "#FACC15" }],
  [/^\/leis(?:\?|$)/, { label: "Abrindo Estudo de Leis", from: "#183A63", to: "#9A6A16", accent: "#FFFFFF" }],
  [/^\/meu-plano(?:\?|$)/, { label: "Abrindo Meu Plano", from: "#F97316", to: "#FACC15", accent: "#2563EB" }],
  [/^\/caderno-de-erros(?:\?|$)/, { label: "Abrindo Caderno de Erros", from: "#BE123C", to: "#F97316", accent: "#FACC15" }],
  [/^\/perfil(?:\?|$)/, { label: "Abrindo Perfil", from: "#64748B", to: "#2563EB", accent: "#22D3EE" }],
  [/^\/carrinho(?:\?|$)/, { label: "Abrindo Carrinho", from: "#F97316", to: "#FACC15", accent: "#FFFFFF" }],
  [/^\/admin(?:\?|\/|$)/, { label: "Abrindo Administracao", from: "#111827", to: "#334155", accent: "#FACC15" }],
  [/^\/onboarding(?:\?|$)/, { label: "Abrindo Onboarding", from: "#2563EB", to: "#F97316", accent: "#FACC15" }],
  [/^\/diagnostico(?:\?|$)/, { label: "Abrindo Diagnostico", from: "#7C3AED", to: "#2563EB", accent: "#22C55E" }],
];

export function routeLoadingMeta(href: string): RouteLoadingMeta {
  const match = routeMeta.find(([pattern]) => pattern.test(href));
  return match?.[1] ?? defaultMeta;
}
