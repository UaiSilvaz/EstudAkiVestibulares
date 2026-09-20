export function formatCoursePrice(cents: number) {
  if (cents <= 0) return "Gratuito";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function formatCourseDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes} min`;
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

export function formatTimestamp(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
