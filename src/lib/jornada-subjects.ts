export type JornadaSubjectSlug =
  | "matematica"
  | "linguagens"
  | "redacao"
  | "fisica"
  | "quimica"
  | "biologia"
  | "ciencias-humanas";

export type JornadaSubject = {
  slug: JornadaSubjectSlug;
  name: string;
  shortName: string;
  icon: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  description: string;
  symbol: string;
};

export const jornadaSubjects: JornadaSubject[] = [
  {
    slug: "matematica",
    name: "Matemática",
    shortName: "Mat",
    icon: "/assets/jornada-icons/matematica-compact.png",
    primaryColor: "#2563EB",
    secondaryColor: "#38BDF8",
    backgroundColor: "#EFF6FF",
    description: "Domine números, gráficos e estratégias para resolver problemas com segurança.",
    symbol: "Pi azul",
  },
  {
    slug: "linguagens",
    name: "Linguagens",
    shortName: "Ling",
    icon: "/assets/jornada-icons/linguagens-compact.png",
    primaryColor: "#0E7490",
    secondaryColor: "#22C55E",
    backgroundColor: "#ECFDF5",
    description: "Leia textos, imagens e linguagens digitais com interpretação precisa.",
    symbol: "Planeta com idiomas",
  },
  {
    slug: "redacao",
    name: "Redação",
    shortName: "Red",
    icon: "/assets/jornada-icons/redacao-compact.png",
    primaryColor: "#F97316",
    secondaryColor: "#FACC15",
    backgroundColor: "#FFF7ED",
    description: "Construa tese, argumentos e intervenção com clareza e repertório produtivo.",
    symbol: "Caderno e lápis",
  },
  {
    slug: "fisica",
    name: "Física",
    shortName: "Fis",
    icon: "/assets/jornada-icons/fisica-compact.png",
    primaryColor: "#EF4444",
    secondaryColor: "#FB7185",
    backgroundColor: "#FFF1F2",
    description: "Entenda movimentos, energia, ondas e circuitos a partir de situações reais.",
    symbol: "Atomo vermelho",
  },
  {
    slug: "quimica",
    name: "Química",
    shortName: "Qui",
    icon: "/assets/jornada-icons/quimica-compact.png",
    primaryColor: "#7C3AED",
    secondaryColor: "#C084FC",
    backgroundColor: "#F5F3FF",
    description: "Conecte matéria, átomos, reações e cálculos químicos com aplicações cotidianas.",
    symbol: "Frasco roxo",
  },
  {
    slug: "biologia",
    name: "Biologia",
    shortName: "Bio",
    icon: "/assets/jornada-icons/biologia-compact.png",
    primaryColor: "#16A34A",
    secondaryColor: "#84CC16",
    backgroundColor: "#F0FDF4",
    description: "Explore células, genética, ecologia e corpo humano em progressão clara.",
    symbol: "DNA verde",
  },
  {
    slug: "ciencias-humanas",
    name: "Ciências Humanas",
    shortName: "Humanas",
    icon: "/assets/jornada-icons/humanas-compact.png",
    primaryColor: "#EAB308",
    secondaryColor: "#F97316",
    backgroundColor: "#FEFCE8",
    description: "Leia mapas, processos históricos, sociedade, política e território.",
    symbol: "Mapa amarelo",
  },
];

export function getJornadaSubject(slug: string) {
  return jornadaSubjects.find((subject) => subject.slug === slug) ?? null;
}
