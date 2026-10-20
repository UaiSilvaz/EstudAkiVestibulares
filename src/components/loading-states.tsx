import { EstudakiLoadingState } from "@/components/estudaki-loading-provider";

export { EstudakiLoadingState };

export function DashboardLoadingState() {
  return <EstudakiLoadingState href="/dashboard" label="Preparando seu estudo de hoje" />;
}

export function PlatformLoadingState() {
  return <EstudakiLoadingState label="Abrindo sua área de estudos" />;
}

export function QuestionsLoadingState() {
  return <EstudakiLoadingState href="/questions" label="Preparando sua lista de questões" />;
}

export function JourneyLoadingState() {
  return <EstudakiLoadingState href="/cursos" label="Abrindo seus cursos" />;
}

export function SimuladosLoadingState() {
  return <EstudakiLoadingState href="/simulados" label="Carregando simulados" />;
}

export function RedacaoLoadingState() {
  return <EstudakiLoadingState href="/redacao" label="Abrindo seu treino de redação" />;
}

export function PerformanceLoadingState() {
  return <EstudakiLoadingState href="/performance" label="Calculando sua evolução" />;
}

export function ProfileLoadingState() {
  return <EstudakiLoadingState href="/perfil" label="Carregando seus dados" />;
}

export function LibraryLoadingState() {
  return <EstudakiLoadingState href="/biblioteca" label="Organizando seus materiais" />;
}

export function ExamsLoadingState() {
  return <EstudakiLoadingState href="/provas" label="Buscando provas e simulados" />;
}

export function ReviewsLoadingState() {
  return <EstudakiLoadingState href="/revisoes" label="Preparando suas revisões" />;
}

export function ScheduleLoadingState() {
  return <EstudakiLoadingState href="/cronograma" label="Atualizando seu cronograma" />;
}
