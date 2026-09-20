import { EstudakiLoadingState } from "@/components/estudaki-loading-provider";

export { EstudakiLoadingState };

export function DashboardLoadingState() {
  return <EstudakiLoadingState label="Preparando seu estudo de hoje" />;
}

export function PlatformLoadingState() {
  return <EstudakiLoadingState label="Abrindo sua área de estudos" />;
}

export function QuestionsLoadingState() {
  return <EstudakiLoadingState label="Preparando sua lista de questões" />;
}

export function JourneyLoadingState() {
  return <EstudakiLoadingState label="Montando seus mundos e trilhas" />;
}

export function SimuladosLoadingState() {
  return <EstudakiLoadingState label="Carregando simulados" />;
}

export function RedacaoLoadingState() {
  return <EstudakiLoadingState label="Abrindo seu treino de redação" />;
}

export function PerformanceLoadingState() {
  return <EstudakiLoadingState label="Calculando sua evolução" />;
}

export function ProfileLoadingState() {
  return <EstudakiLoadingState label="Carregando seus dados" />;
}

export function LibraryLoadingState() {
  return <EstudakiLoadingState label="Organizando seus materiais" />;
}

export function ExamsLoadingState() {
  return <EstudakiLoadingState label="Buscando provas e simulados" />;
}

export function ReviewsLoadingState() {
  return <EstudakiLoadingState label="Preparando suas revisões" />;
}

export function ScheduleLoadingState() {
  return <EstudakiLoadingState label="Atualizando seu cronograma" />;
}
