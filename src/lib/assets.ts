export const WATERMARK_SRC = "/marcadeagua/MARCA%20DE%20AGUA.jpg";

export const vestibularLogoMap: Record<string, string> = {
  enem: "/vestibulares/Enem_logo.png",
  etec: "/vestibulares/etec.png",
  fatec: "/vestibulares/fatec-identidade.jpg",
  fuvest: "/vestibulares/img-logo-fuvest-1.webp",
  unesp: "/vestibulares/unesp.png",
  unicamp: "/vestibulares/UNICAMP_logo.svg.png",
  "provao-paulista": "/vestibulares/LOGO%20PROV%C3%83O%20PAULISTA.png",
};

export const vestibularLoopMap: Record<string, string> = {
  enem: "/loop/Enem_logo.png",
  etec: "/loop/etec.png",
  fatec: "/loop/fatec-identidade-removebg-preview.png",
  fuvest: "/loop/img-logo-fuvest-1.webp",
  unesp: "/loop/unesp-removebg-preview.png",
  unicamp: "/loop/UNICAMP_logo.svg.png",
  "provao-paulista": "/vestibulares/LOGO%20PROV%C3%83O%20PAULISTA.png",
};

export const materialCovers = [
  {
    match: ["kit enem"],
    src: "/assets/norte-design/06_Capas_Digitais/kit-enem.svg",
    label: "Kit ENEM Norte",
  },
  {
    match: ["super pack", "250 questoes"],
    src: "/assets/norte-design/06_Capas_Digitais/super-pack-etec.svg",
    label: "Super Pack ETEC",
  },
  {
    match: ["formula da aprovacao"],
    src: "/assets/norte-design/06_Capas_Digitais/formula-aprovacao-etec.svg",
    label: "Fórmula da Aprovação ETEC",
  },
  {
    match: ["linguagens", "humanas", "redacao"],
    src: "/assets/norte-design/06_Capas_Digitais/enem-humanas-linguagens.svg",
    label: "ENEM Linguagens e Humanas",
  },
  {
    match: ["exatas", "natureza", "matematica", "geometria"],
    src: "/assets/norte-design/06_Capas_Digitais/enem-exatas-natureza.svg",
    label: "ENEM Exatas e Natureza",
  },
  {
    match: ["etec", "vestibulinho"],
    src: "/assets/norte-design/06_Capas_Digitais/formula-aprovacao-etec.svg",
    label: "ETEC Norte",
  },
];

export function coverForMaterial(title: string, index = 0) {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    materialCovers.find((cover) =>
      cover.match.some((term) => normalized.includes(term.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))),
    ) ?? materialCovers[index % materialCovers.length]
  );
}

export function norteCoverForLegacy(url: string | null | undefined, title: string, index = 0) {
  if (!url || /^\/(?:cadernos|materiaiscapas|materials\/covers)\//i.test(url)) {
    return coverForMaterial(title, index).src;
  }
  return url;
}

export function logoForVestibular(slug: string) {
  return vestibularLogoMap[slug] ?? "/assets/norte-design/03_App_Favicon/norte_icone_256x256.png";
}

export function loopImageForVestibular(slug: string) {
  return vestibularLoopMap[slug] ?? logoForVestibular(slug);
}
