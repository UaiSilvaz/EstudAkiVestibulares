export const WATERMARK_SRC = "/marcadeagua/MARCA%20DE%20AGUA.jpg";

export const vestibularLogoMap: Record<string, string> = {
  enem: "/vestibulares/Enem_logo.png",
  etec: "/vestibulares/etec.png",
  fatec: "/vestibulares/fatec-identidade.jpg",
  fuvest: "/vestibulares/img-logo-fuvest-1.webp",
  unesp: "/vestibulares/unesp.png",
  unicamp: "/vestibulares/UNICAMP_logo.svg.png",
};

export const vestibularLoopMap: Record<string, string> = {
  enem: "/loop/Enem_logo.png",
  etec: "/loop/etec.png",
  fatec: "/loop/fatec-identidade-removebg-preview.png",
  fuvest: "/loop/img-logo-fuvest-1.webp",
  unesp: "/loop/unesp-removebg-preview.png",
  unicamp: "/loop/UNICAMP_logo.svg.png",
};

export const materialCovers = [
  {
    match: ["linguagens", "humanas", "redacao", "redacao"],
    src: "/materiaiscapas/12.jpg",
    label: "ENEM Linguagens e Humanas",
  },
  {
    match: ["exatas", "natureza", "matematica", "geometria"],
    src: "/materiaiscapas/CADERNO_1000_QUESTOES_ENEM_ESTUDAKI.pdf%20(2).jpg",
    label: "ENEM Exatas e Natureza",
  },
  {
    match: ["etec", "vestibulinho", "aprovacao"],
    src: "/materiaiscapas/F%C3%93RMULA%20DA%20APROVA%C3%87%C3%83O%20-%20VESTIBULINHO%20ETEC%202026%20%23ESTUDAKI.jpg",
    label: "Formula da Aprovacao ETEC",
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

export function logoForVestibular(slug: string) {
  return vestibularLogoMap[slug] ?? "/brand/estudaki-tab.png";
}

export function loopImageForVestibular(slug: string) {
  return vestibularLoopMap[slug] ?? logoForVestibular(slug);
}
