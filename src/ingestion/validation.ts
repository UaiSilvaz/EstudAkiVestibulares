import type {
  CanonicalQuestionManifest,
  IngestionValidationIssue,
  IngestionValidationReport,
} from "./types";

const VALID_ALTERNATIVE_ANSWERS = new Set(["A", "B", "C", "D", "E"]);

function issue(
  code: string,
  message: string,
  questionId: string | undefined,
  severity: IngestionValidationIssue["severity"] = "error",
): IngestionValidationIssue {
  return { code, message, questionId, severity, stage: "validate" };
}

function hasStudentFacingScreenshot(question: CanonicalQuestionManifest) {
  return question.assets.some(
    (asset) =>
      asset.relation !== "ADMIN_REFERENCE" &&
      (asset.type === "PROMPT_FACSIMILE" ||
        /facsimile|screenshot|print/i.test(asset.originalFile) ||
        /facsimile|screenshot|print/i.test(asset.optimizedFile ?? "")),
  );
}

export function validateQuestionManifest(
  question: CanonicalQuestionManifest,
): IngestionValidationIssue[] {
  const issues: IngestionValidationIssue[] = [];

  if (!question.statementPlainText.trim() && !question.contentBlocks.length) {
    issues.push(issue("statement_missing", "Question has no statement.", question.id));
  }
  if (!question.source.sourceUrl || !question.source.documentUrl) {
    issues.push(issue("source_missing", "Question source is incomplete.", question.id));
  }
  if (!question.source.documentHash.match(/^[a-f0-9]{64}$/i)) {
    issues.push(issue("document_hash_invalid", "Official document hash is invalid.", question.id));
  }
  if (hasStudentFacingScreenshot(question)) {
    issues.push(
      issue(
        "student_facing_facsimile",
        "Prompt facsimile/screenshot cannot be used as final student content.",
        question.id,
      ),
    );
  }
  for (const asset of question.assets) {
    if (asset.originalFile.startsWith("data:") || asset.optimizedFile?.startsWith("data:")) {
      issues.push(issue("asset_base64", "Assets must live in storage, not in the database.", question.id));
    }
    if (!asset.sha256.match(/^[a-f0-9]{64}$/i)) {
      issues.push(issue("asset_hash_invalid", "Asset hash is invalid.", question.id));
    }
    if (asset.width <= 0 || asset.height <= 0) {
      issues.push(issue("asset_dimensions_invalid", "Asset dimensions are invalid.", question.id));
    }
  }
  if (question.type === "MULTIPLE_CHOICE") {
    if (question.alternatives.length !== 5) {
      issues.push(issue("alternatives_count_invalid", "Multiple choice question must have five alternatives.", question.id));
    }
    const letters = question.alternatives.map((alternative) => alternative.letter).join("");
    if (question.alternatives.length === 5 && letters !== "ABCDE") {
      issues.push(issue("alternatives_order_invalid", "Alternatives must be ordered A-E.", question.id));
    }
  }
  if (question.answerStatus === "FINAL") {
    if (!question.officialAnswer || !VALID_ALTERNATIVE_ANSWERS.has(question.officialAnswer)) {
      issues.push(issue("answer_invalid", "Final answer must point to an existing alternative.", question.id));
    }
  }
  if (question.answerStatus === "UNKNOWN" && question.reviewStatus === "AUTO_APPROVED") {
    issues.push(issue("unknown_answer_auto_approved", "Unknown answer requires human review.", question.id));
  }
  if (question.confidence.overall < 0.95 && question.reviewStatus === "AUTO_APPROVED") {
    issues.push(issue("low_confidence_auto_approved", "Low confidence question requires review.", question.id));
  }

  return issues;
}

export function validateQuestionManifests(
  questions: CanonicalQuestionManifest[],
): IngestionValidationReport {
  const issues = questions.flatMap(validateQuestionManifest);
  const hasErrors = issues.some((item) => item.severity === "error");
  return {
    valid: !hasErrors,
    reviewRequired:
      hasErrors ||
      issues.some((item) => item.severity === "warning") ||
      questions.some((question) => question.reviewStatus !== "AUTO_APPROVED"),
    issues,
  };
}
