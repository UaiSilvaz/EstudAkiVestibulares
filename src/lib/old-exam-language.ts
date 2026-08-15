export const OLD_EXAM_LANGUAGE_CHOICES = ["ENGLISH", "SPANISH"] as const;

export type OldExamLanguage = (typeof OLD_EXAM_LANGUAGE_CHOICES)[number];
export type OldExamQuestionLanguage = OldExamLanguage | "NOT_APPLICABLE" | "PORTUGUESE";

export function parseOldExamLanguage(value: string | string[] | null | undefined): OldExamLanguage | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.trim().toUpperCase();
  return OLD_EXAM_LANGUAGE_CHOICES.find((language) => language === normalized) ?? null;
}

export function oldExamLanguageLabel(language: OldExamLanguage) {
  return language === "ENGLISH" ? "Inglês" : "Espanhol";
}

type LanguageLink = {
  numeroQuestao: number;
  ordem: number;
  officialLanguage: OldExamQuestionLanguage;
};

export function selectOldExamLanguageLinks<T extends LanguageLink>(
  links: readonly T[],
  requestedLanguage: OldExamLanguage | null,
) {
  const availableLanguages = OLD_EXAM_LANGUAGE_CHOICES.filter((language) =>
    links.some((link) => link.officialLanguage === language),
  );
  const selectedLanguage =
    (requestedLanguage && availableLanguages.includes(requestedLanguage)
      ? requestedLanguage
      : availableLanguages[0]) ?? null;

  const allowed = links.filter(
    (link) =>
      link.officialLanguage === "NOT_APPLICABLE" ||
      (selectedLanguage !== null && link.officialLanguage === selectedLanguage),
  );
  const byNumber = new Map<number, T>();
  for (const link of allowed) {
    const current = byNumber.get(link.numeroQuestao);
    const linkIsSelectedVariant = link.officialLanguage === selectedLanguage;
    const currentIsSelectedVariant = current?.officialLanguage === selectedLanguage;
    if (!current || (linkIsSelectedVariant && !currentIsSelectedVariant)) {
      byNumber.set(link.numeroQuestao, link);
    }
  }

  return {
    availableLanguages,
    selectedLanguage,
    links: [...byNumber.values()].sort(
      (left, right) => left.ordem - right.ordem || left.numeroQuestao - right.numeroQuestao,
    ),
  };
}
