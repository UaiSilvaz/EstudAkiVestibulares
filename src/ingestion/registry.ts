import type { ExamSourceProvider } from "./types";
import { fgvProvider } from "./providers/fgv/provider";
import { inepProvider } from "./providers/inep/provider";
import { vunespProvider } from "./providers/vunesp/provider";

export const sourceProviders = [
  inepProvider,
  vunespProvider,
  fgvProvider,
] satisfies ExamSourceProvider[];

export function getSourceProvider(slug: string) {
  const provider = sourceProviders.find((item) => item.slug === slug);
  if (!provider) {
    throw new Error(
      `Unknown provider "${slug}". Available providers: ${sourceProviders
        .map((item) => item.slug)
        .join(", ")}.`,
    );
  }
  return provider;
}
