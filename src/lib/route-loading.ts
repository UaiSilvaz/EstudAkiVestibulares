export type RouteLoadingMeta = {
  label: string;
};

const defaultMeta: RouteLoadingMeta = {
  label: "Abrindo Norte Preparatórios",
};

const routeMeta: Array<[RegExp, RouteLoadingMeta]> = [
  [/^\/dashboard(?:\/|$)/, { label: "Abrindo Início" }],
  [/^\/cronograma(?:\/|$)/, { label: "Abrindo Meu Plano" }],
  [/^\/questions(?:\/|$)/, { label: "Abrindo Banco de Questões" }],
  [/^\/simulados(?:\/|$)/, { label: "Abrindo Simulados" }],
  [/^\/flashcards(?:\/|$)/, { label: "Abrindo Flashcards" }],
  [/^\/redacao(?:\/|$)/, { label: "Abrindo Redação" }],
  [/^\/biblioteca(?:\/|$)/, { label: "Abrindo Biblioteca" }],
  [/^\/materials(?:\/|$)/, { label: "Abrindo Materiais" }],
  [/^\/provas(?:\/|$)/, { label: "Abrindo Provas" }],
  [/^\/provas-antigas(?:\/|$)/, { label: "Abrindo Provas Antigas" }],
  [/^\/performance(?:\/|$)/, { label: "Calculando Desempenho" }],
  [/^\/ranking(?:\/|$)/, { label: "Abrindo Ranking" }],
  [/^\/conquistas(?:\/|$)/, { label: "Abrindo Conquistas" }],
  [/^\/community(?:\/|$)/, { label: "Abrindo Comunidade" }],
  [/^\/aulas(?:\/|$)/, { label: "Abrindo Aulas" }],
  [/^\/cursos(?:\/|$)/, { label: "Abrindo Cursos" }],
  [/^\/videos(?:\/|$)/, { label: "Abrindo Vídeos" }],
  [/^\/aula(?:\/|$)/, { label: "Abrindo Aula" }],
  [/^\/revisoes(?:\/|$)/, { label: "Abrindo Revisões" }],
  [/^\/certificados(?:\/|$)/, { label: "Abrindo Certificados" }],
  [/^\/compras(?:\/|$)/, { label: "Abrindo Compras" }],
  [/^\/atividade(?:\/|$)/, { label: "Abrindo Atividade" }],
  [/^\/salas(?:\/|$)/, { label: "Abrindo Salas de Estudo" }],
  [/^\/explorar(?:\/|$)/, { label: "Abrindo Explorar" }],
  [/^\/preparacao(?:\/|$)/, { label: "Abrindo Preparação" }],
  [/^\/preparacoes(?:\/|$)/, { label: "Abrindo Preparações" }],
  [/^\/estudar(?:\/|$)/, { label: "Preparando Estudo Agora" }],
  [/^\/radar(?:\/|$)/, { label: "Abrindo Radar da Prova" }],
  [/^\/edital(?:\/|$)/, { label: "Abrindo Edital Inteligente" }],
  [/^\/leis(?:\/|$)/, { label: "Abrindo Estudo de Leis" }],
  [/^\/meu-plano(?:\/|$)/, { label: "Abrindo Meu Plano" }],
  [/^\/caderno-de-erros(?:\/|$)/, { label: "Abrindo Caderno de Erros" }],
  [/^\/perfil(?:\/|$)/, { label: "Abrindo Perfil" }],
  [/^\/carrinho(?:\/|$)/, { label: "Abrindo Carrinho" }],
  [/^\/admin(?:\/|$)/, { label: "Abrindo Administração" }],
  [/^\/onboarding(?:\/|$)/, { label: "Abrindo Onboarding" }],
  [/^\/diagnostico(?:\/|$)/, { label: "Abrindo Diagnóstico" }],
];

export function routeLoadingMeta(href: string): RouteLoadingMeta {
  const url = new URL(href, "http://estudaki.local");
  if (url.pathname === "/login") {
    return url.searchParams.get("signup") === "true"
      ? { label: "Preparando seu cadastro" }
      : { label: "Abrindo seu acesso" };
  }
  const match = routeMeta.find(([pattern]) => pattern.test(url.pathname));
  return match?.[1] ?? defaultMeta;
}
