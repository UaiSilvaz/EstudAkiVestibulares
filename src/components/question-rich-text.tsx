import { formatQuestionText } from "@/lib/question-formatting";
import {
  hasRichTextMarkup,
  sanitizeInlineRichTextHtml,
  sanitizeRichTextHtml,
} from "@/lib/question-rich-text";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null | undefined;
  className?: string;
  inline?: boolean;
  fallback?: React.ReactNode;
};

export function QuestionRichText({ value, className, inline = false, fallback }: Props) {
  const text = value?.trim() ?? "";
  if (!text) return fallback ? <>{fallback}</> : null;

  if (hasRichTextMarkup(text)) {
    const html = inline ? sanitizeInlineRichTextHtml(text) : sanitizeRichTextHtml(text);
    if (inline) {
      return (
        <span
          className={cn("question-rich-text question-rich-text-inline", className)}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    return (
      <div
        className={cn("question-rich-text", className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (inline) {
    return <span className={className}>{formatQuestionText(text)}</span>;
  }

  return <p className={className}>{formatQuestionText(text)}</p>;
}
