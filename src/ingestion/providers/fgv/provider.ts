import { createPlannedProvider } from "../stub-provider";

export const fgvProvider = createPlannedProvider({
  slug: "fgv",
  name: "FGV",
  baseUrl: "https://conhecimento.fgv.br/concursos",
  priority: 30,
  notes:
    "Next implementation should start with official OAB and public contest PDFs, keeping preliminary and final answer keys separate.",
});
