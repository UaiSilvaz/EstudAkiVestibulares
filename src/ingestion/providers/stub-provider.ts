import type {
  ExamSourceProvider,
  ProviderDiscoveryResult,
} from "../types";

type StubProviderInput = {
  slug: string;
  name: string;
  baseUrl: string;
  priority: number;
  notes: string;
};

export function createPlannedProvider({
  slug,
  name,
  baseUrl,
  priority,
  notes,
}: StubProviderInput): ExamSourceProvider {
  return {
    slug,
    name,
    baseUrl,
    enabled: false,
    priority,
    rateLimit: {
      requestsPerMinute: 6,
      burst: 1,
    },
    async discoverExams(): Promise<ProviderDiscoveryResult> {
      return {
        provider: slug,
        exams: [],
        warnings: [
          `${name} is registered as a planned provider. It will not scrape private banks or infer official answers.`,
          notes,
        ],
        logs: [`[${slug.toUpperCase()}] planned provider only`],
      };
    },
  };
}
