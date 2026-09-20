import { createPlannedProvider } from "../stub-provider";

export const vunespProvider = createPlannedProvider({
  slug: "vunesp",
  name: "VUNESP",
  baseUrl: "https://www.vunesp.com.br/",
  priority: 20,
  notes:
    "Next implementation should map official exam pages for UNESP, ETEC, FATEC and public contests before any extraction is enabled.",
});
