type ResolutionInput = {
  vestibular: string;
  year: number;
  questionNumber: number;
  statement: string;
  correctAlternative: string;
};

export type GeneratedResolution = {
  shortComment: string;
  fullResolution: string;
  steps: string[];
  alternativeComments: Record<"A" | "B" | "C" | "D" | "E", string>;
  commonError: string;
  studyTip: string;
  relatedContent: string;
};

function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const output = (payload as { output?: unknown[] }).output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: string }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}

export async function generateOfficialResolution(input: ResolutionInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Configure OPENAI_API_KEY para gerar resoluções.");
  }
  const model = process.env.OPENAI_RESOLUTION_MODEL || "gpt-5.4-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: "system",
          content:
            "Você é um professor brasileiro experiente. Gere uma resolução pedagógica em português do Brasil. Use apenas o enunciado e o gabarito fornecidos; não invente dados ausentes. Se as alternativas não estiverem visíveis, diga isso nos comentários em vez de supor seu conteúdo. A saída sempre ficará em revisão humana.",
        },
        {
          role: "user",
          content: [
            `Vestibular: ${input.vestibular}`,
            `Ano: ${input.year}`,
            `Questão: ${input.questionNumber}`,
            `Gabarito oficial: ${input.correctAlternative}`,
            "Enunciado:",
            input.statement,
          ].join("\n"),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "official_question_resolution",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              shortComment: { type: "string" },
              fullResolution: { type: "string" },
              steps: { type: "array", items: { type: "string" } },
              alternativeComments: {
                type: "object",
                additionalProperties: false,
                properties: {
                  A: { type: "string" },
                  B: { type: "string" },
                  C: { type: "string" },
                  D: { type: "string" },
                  E: { type: "string" },
                },
                required: ["A", "B", "C", "D", "E"],
              },
              commonError: { type: "string" },
              studyTip: { type: "string" },
              relatedContent: { type: "string" },
            },
            required: [
              "shortComment",
              "fullResolution",
              "steps",
              "alternativeComments",
              "commonError",
              "studyTip",
              "relatedContent",
            ],
          },
        },
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object"
        ? (payload as { error?: { message?: string } }).error?.message
        : null;
    throw new Error(message || `OpenAI respondeu ${response.status}.`);
  }
  const text = outputText(payload);
  if (!text) throw new Error("A OpenAI não retornou uma resolução utilizável.");
  return { resolution: JSON.parse(text) as GeneratedResolution, model };
}
