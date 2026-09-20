export type ProviderStage =
  | "discover"
  | "fetch_exam"
  | "fetch_answer_key"
  | "extract"
  | "normalize"
  | "validate"
  | "dedupe"
  | "publish";

export type ReviewStatus = "AUTO_APPROVED" | "REVIEW_REQUIRED" | "REJECTED";

export type AnswerStatus =
  | "UNKNOWN"
  | "PRELIMINARY"
  | "FINAL"
  | "ANNULLED"
  | "CHANGED_AFTER_APPEAL";

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "CEBRASPE"
  | "NUMERIC"
  | "DISCURSIVE"
  | "MULTI_SELECT"
  | "OTHER";

export type DifficultyBand =
  | "VERY_EASY"
  | "EASY"
  | "MEDIUM"
  | "HARD"
  | "VERY_HARD";

export type ContentBlock =
  | { type: "paragraph"; content: string; order: number }
  | { type: "support_text"; content: string; order: number }
  | { type: "command"; content: string; order: number }
  | { type: "credit"; content: string; order: number }
  | { type: "image"; assetId: string; content?: string; order: number };

export type SourceBoundingBox = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AssetManifest = {
  id: string;
  type:
    | "VISUAL"
    | "ALTERNATIVE_VISUAL"
    | "ORIGINAL_REFERENCE"
    | "PROMPT_FACSIMILE";
  relation: "STATEMENT" | "ALTERNATIVE" | "ADMIN_REFERENCE";
  originalFile: string;
  optimizedFile?: string;
  thumbnailFile?: string;
  width: number;
  height: number;
  mimeType: string;
  sha256: string;
  altText: string;
  caption?: string;
  sourcePage?: number;
  boundingBox?: SourceBoundingBox;
  alternativeKey?: string;
};

export type AlternativeManifest = {
  id?: string;
  letter: string;
  order: number;
  contentHtml: string;
  contentPlainText: string;
  contentBlocks: ContentBlock[];
  assets: AssetManifest[];
};

export type QuestionSourceManifest = {
  provider: string;
  sourceUrl: string;
  officialSourceUrl?: string;
  documentUrl: string;
  documentName: string;
  documentHash: string;
  downloadedAt?: string;
  pageStart?: number;
  pageEnd?: number;
  answerKeyDocumentUrl?: string;
  answerKeyDocumentHash?: string;
  extractionMethod?: string;
  extractionVersion?: string;
  originalNumber?: number;
  originalExamId?: string;
};

export type CanonicalQuestionManifest = {
  id: string;
  publicId?: string;
  externalId: string;
  fingerprint: string;
  statementHtml: string;
  statementPlainText: string;
  contentBlocks: ContentBlock[];
  alternatives: AlternativeManifest[];
  officialAnswer?: string;
  answerStatus: AnswerStatus;
  questionNumber?: number;
  type: QuestionType;
  year: number;
  examName: string;
  boardName: string;
  institutionName: string;
  subject?: string;
  topics: string[];
  difficulty?: DifficultyBand;
  confidence: {
    text: number;
    alternatives: number;
    images: number;
    answer: number;
    classification: number;
    overall: number;
  };
  reviewStatus: ReviewStatus;
  publicationBlockers: string[];
  source: QuestionSourceManifest;
  assets: AssetManifest[];
};

export type OfficialDocumentRef = {
  kind: "exam" | "answer_key" | "index";
  url: string;
  localPath?: string;
  sha256?: string;
  sizeBytes?: number;
  mimeType?: string;
};

export type DiscoveredExam = {
  provider: string;
  id: string;
  examName: string;
  year: number;
  edition: string;
  application?: string;
  day?: number;
  phase?: string;
  bookletCode?: string;
  bookletColor?: string;
  institutionName: string;
  boardName: string;
  sourcePageUrl: string;
  documents: OfficialDocumentRef[];
  expectedQuestionCount?: number;
  metadata: Record<string, string | number | boolean | null>;
};

export type ProviderDiscoveryInput = {
  year?: number;
  day?: number;
  limit?: number;
  refresh?: boolean;
};

export type ProviderDiscoveryResult = {
  provider: string;
  exams: DiscoveredExam[];
  warnings: string[];
  logs: string[];
};

export type FetchedExamDocument = {
  exam: DiscoveredExam;
  examFile?: OfficialDocumentRef;
  answerKeyFile?: OfficialDocumentRef;
  warnings: string[];
};

export type IngestionValidationIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  questionId?: string;
  stage?: ProviderStage;
};

export type IngestionValidationReport = {
  valid: boolean;
  reviewRequired: boolean;
  issues: IngestionValidationIssue[];
};

export type ExamSourceProvider = {
  slug: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  priority: number;
  rateLimit: {
    requestsPerMinute: number;
    burst: number;
  };
  discoverExams(input: ProviderDiscoveryInput): Promise<ProviderDiscoveryResult>;
  fetchExam?(exam: DiscoveredExam): Promise<FetchedExamDocument>;
  extractQuestions?(
    document: FetchedExamDocument,
  ): Promise<CanonicalQuestionManifest[]>;
  normalize?(
    question: CanonicalQuestionManifest,
  ): Promise<CanonicalQuestionManifest>;
  validate?(
    questions: CanonicalQuestionManifest[],
  ): Promise<IngestionValidationReport>;
};
