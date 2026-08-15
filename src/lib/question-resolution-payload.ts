import "server-only";

import { parseJson } from "@/lib/utils";

type AlternativeComments = Record<string, string>;

type ResolutionSource = {
  explanation: string;
  alternativeExplanations: string;
  pedagogyComment: string | null;
  authorialResolutions: Array<{
    shortComment: string | null;
    fullResolution: string | null;
    reasoningPath: unknown;
    steps: unknown;
    alternativeComments: unknown;
    commonError: string | null;
    studyTip: string | null;
    keywords: unknown;
    relatedContent: unknown;
  }>;
};

/**
 * Serializa a correção somente depois da entrega. O mesmo formato é usado no
 * fluxo público aprovado e na prévia administrativa de conteúdo em REVIEW.
 */
export function questionResolutionPayload(question: ResolutionSource) {
  const resolution = question.authorialResolutions[0];
  return {
    explanation: resolution?.fullResolution?.trim() || question.explanation,
    alternativeExplanations: resolution
      ? (resolution.alternativeComments as AlternativeComments)
      : parseJson<AlternativeComments>(question.alternativeExplanations, {}),
    pedagogyComment: resolution?.shortComment?.trim() || question.pedagogyComment,
    authorialResolution: resolution
      ? {
          reasoningPath: resolution.reasoningPath,
          steps: resolution.steps,
          commonError: resolution.commonError,
          studyTip: resolution.studyTip,
          keywords: resolution.keywords,
          relatedContent: resolution.relatedContent,
        }
      : null,
  };
}
