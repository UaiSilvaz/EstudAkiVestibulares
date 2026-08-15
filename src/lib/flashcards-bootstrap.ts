import { ContentStatus } from "@prisma/client";
import { db } from "@/lib/db";

type CuratedCard = {
  subject: string;
  deck: string;
  front: string;
  back: string;
};

const subjectMeta: Record<string, { name: string; color: string }> = {
  matematica: { name: "Matemática", color: "#2563EB" },
  fisica: { name: "Física", color: "#0EA5E9" },
  quimica: { name: "Química", color: "#F97316" },
  biologia: { name: "Biologia", color: "#22C55E" },
  portugues: { name: "Português e Redação", color: "#F59E0B" },
  humanas: { name: "Ciências Humanas", color: "#8B5CF6" },
  etec: { name: "Vestibulinho ETEC", color: "#06B6D4" },
};

const curatedCards: CuratedCard[] = [
  { subject: "matematica", deck: "Matemática / Fórmulas essenciais", front: "Área do triângulo", back: "A = (base x altura) / 2. No ENEM, procure identificar qual medida é a base e qual é a altura perpendicular." },
  { subject: "matematica", deck: "Matemática / Fórmulas essenciais", front: "Área do trapézio", back: "A = ((B + b) x h) / 2, em que B é a base maior, b é a base menor e h é a altura." },
  { subject: "matematica", deck: "Matemática / Fórmulas essenciais", front: "Teorema de Pitágoras", back: "Em triângulo retângulo: a² = b² + c². A hipotenusa é sempre o maior lado." },
  { subject: "matematica", deck: "Matemática / Fórmulas essenciais", front: "Comprimento da circunferência", back: "C = 2πr ou C = πd. Use d = 2r quando o enunciado der o diâmetro." },
  { subject: "matematica", deck: "Matemática / Fórmulas essenciais", front: "Área do círculo", back: "A = πr². Se o raio dobra, a área fica 4 vezes maior." },
  { subject: "matematica", deck: "Matemática / Fórmulas essenciais", front: "Volume do cilindro", back: "V = área da base x altura = πr²h." },
  { subject: "matematica", deck: "Matemática / Fórmulas essenciais", front: "Juros simples", back: "J = C x i x t. Montante: M = C + J. A taxa i deve estar em decimal." },
  { subject: "matematica", deck: "Matemática / Fórmulas essenciais", front: "Juros compostos", back: "M = C(1 + i)^t. Crescimento percentual acumulado normalmente pede essa fórmula." },
  { subject: "matematica", deck: "Matemática / Razão e porcentagem", front: "Como calcular aumento percentual?", back: "Aumento % = ((valor final - valor inicial) / valor inicial) x 100." },
  { subject: "matematica", deck: "Matemática / Razão e porcentagem", front: "Como calcular desconto percentual?", back: "Desconto % = ((valor inicial - valor final) / valor inicial) x 100." },
  { subject: "matematica", deck: "Matemática / Razão e porcentagem", front: "Escala 1:50 significa o quê?", back: "1 unidade no desenho representa 50 unidades reais. Multiplique a medida do desenho por 50 para ir ao real." },
  { subject: "matematica", deck: "Matemática / Estatística", front: "Média aritmética", back: "Some todos os valores e divida pela quantidade de valores." },
  { subject: "matematica", deck: "Matemática / Estatística", front: "Mediana", back: "É o valor central com os dados em ordem. Se a quantidade for par, é a média dos dois valores centrais." },
  { subject: "matematica", deck: "Matemática / Estatística", front: "Moda", back: "É o valor que aparece com maior frequência no conjunto de dados." },
  { subject: "matematica", deck: "Matemática / Funções", front: "Função afim", back: "f(x) = ax + b. O coeficiente a indica a taxa de variação; b é o valor quando x = 0." },
  { subject: "matematica", deck: "Matemática / Funções", front: "Função quadrática", back: "f(x) = ax² + bx + c. O gráfico é uma parábola; se a > 0, abre para cima; se a < 0, abre para baixo." },
  { subject: "fisica", deck: "Física / Mecânica", front: "Velocidade média", back: "v = Δs / Δt. Atenção às unidades: km/h ou m/s." },
  { subject: "fisica", deck: "Física / Mecânica", front: "Aceleração média", back: "a = Δv / Δt. Se a velocidade aumenta, a aceleração é positiva no sentido do movimento." },
  { subject: "fisica", deck: "Física / Mecânica", front: "Segunda lei de Newton", back: "Fresultante = m x a. Quanto maior a massa, maior a força necessária para produzir a mesma aceleração." },
  { subject: "fisica", deck: "Física / Mecânica", front: "Energia cinética", back: "Ec = m v² / 2. Se a velocidade dobra, a energia cinética quadruplica." },
  { subject: "fisica", deck: "Física / Mecânica", front: "Energia potencial gravitacional", back: "Epg = m g h. Depende da massa, da gravidade e da altura em relação ao referencial." },
  { subject: "fisica", deck: "Física / Mecânica", front: "Trabalho de uma força constante", back: "W = F x d x cosθ. Se força e deslocamento têm o mesmo sentido, cosθ = 1." },
  { subject: "fisica", deck: "Física / Ondas", front: "Equação fundamental da onda", back: "v = λ f. Velocidade é comprimento de onda vezes frequência." },
  { subject: "fisica", deck: "Física / Ondas", front: "Som mais agudo significa", back: "Maior frequência. Som mais grave significa menor frequência." },
  { subject: "fisica", deck: "Física / Eletricidade", front: "Lei de Ohm", back: "U = R i. Tensão é resistência vezes corrente elétrica." },
  { subject: "fisica", deck: "Física / Eletricidade", front: "Potência elétrica", back: "P = U i. Também pode aparecer como P = R i² ou P = U²/R." },
  { subject: "fisica", deck: "Física / Calorimetria", front: "Calor sensível", back: "Q = m c ΔT. Usa-se quando há variação de temperatura sem mudança de estado físico." },
  { subject: "fisica", deck: "Física / Calorimetria", front: "Calor latente", back: "Q = m L. Usa-se quando há mudança de estado físico sem variação de temperatura." },
  { subject: "quimica", deck: "Química / Estequiometria", front: "Número de mols", back: "n = m / M, em que m é a massa da amostra e M é a massa molar." },
  { subject: "quimica", deck: "Química / Estequiometria", front: "Constante de Avogadro", back: "1 mol contém aproximadamente 6,02 x 10²³ partículas." },
  { subject: "quimica", deck: "Química / Soluções", front: "Concentração comum", back: "C = m / V. Geralmente aparece em g/L." },
  { subject: "quimica", deck: "Química / Soluções", front: "Molaridade", back: "M = n / V, com V em litros." },
  { subject: "quimica", deck: "Química / pH", front: "pH ácido, neutro e básico", back: "pH < 7 é ácido; pH = 7 é neutro; pH > 7 é básico, a 25 °C." },
  { subject: "quimica", deck: "Química / Ligações", front: "Ligação iônica", back: "Ocorre pela atração entre íons, geralmente metal + ametal. Há transferência de elétrons." },
  { subject: "quimica", deck: "Química / Ligações", front: "Ligação covalente", back: "Ocorre por compartilhamento de elétrons, geralmente entre ametais." },
  { subject: "quimica", deck: "Química / Orgânica", front: "Hidrocarbonetos", back: "São compostos formados apenas por carbono e hidrogênio." },
  { subject: "quimica", deck: "Química / Orgânica", front: "Função álcool", back: "Possui grupo hidroxila -OH ligado a carbono saturado." },
  { subject: "quimica", deck: "Química / Reações", front: "Oxidação e redução", back: "Oxidação perde elétrons; redução ganha elétrons. O NOX ajuda a identificar o processo." },
  { subject: "biologia", deck: "Biologia / Citologia", front: "Função da mitocôndria", back: "Produção de ATP por respiração celular. É muito associada à energia da célula." },
  { subject: "biologia", deck: "Biologia / Citologia", front: "Função dos ribossomos", back: "Síntese de proteínas." },
  { subject: "biologia", deck: "Biologia / Citologia", front: "Diferença entre DNA e RNA", back: "DNA tem desoxirribose e bases A, T, C, G. RNA tem ribose e bases A, U, C, G." },
  { subject: "biologia", deck: "Biologia / Genética", front: "Genótipo", back: "Conjunto de genes de um indivíduo para determinada característica." },
  { subject: "biologia", deck: "Biologia / Genética", front: "Fenótipo", back: "Característica observável, resultado da interação entre genótipo e ambiente." },
  { subject: "biologia", deck: "Biologia / Genética", front: "Indivíduo heterozigoto", back: "Possui alelos diferentes para um gene, como Aa." },
  { subject: "biologia", deck: "Biologia / Ecologia", front: "Cadeia alimentar", back: "Sequência linear de transferência de matéria e energia entre seres vivos." },
  { subject: "biologia", deck: "Biologia / Ecologia", front: "Produtores", back: "Organismos autotróficos, como plantas e algas, que produzem matéria orgânica." },
  { subject: "biologia", deck: "Biologia / Ecologia", front: "Bioacumulação", back: "Acúmulo de substâncias persistentes no organismo ao longo do tempo." },
  { subject: "biologia", deck: "Biologia / Ecologia", front: "Magnificação trófica", back: "A concentração de poluentes aumenta nos níveis tróficos mais altos." },
  { subject: "biologia", deck: "Biologia / Fisiologia", front: "Hemácias", back: "Transportam gases respiratórios, principalmente oxigênio, graças à hemoglobina." },
  { subject: "biologia", deck: "Biologia / Fisiologia", front: "Vacinas", back: "Estimulam a memória imunológica antes do contato real com o agente causador da doença." },
  { subject: "portugues", deck: "Linguagens / Interpretação", front: "Ideia central de um texto", back: "É a tese ou mensagem principal. Procure o que todas as partes do texto ajudam a defender." },
  { subject: "portugues", deck: "Linguagens / Interpretação", front: "Inferência", back: "É concluir algo que não foi dito diretamente, mas está sustentado pelas pistas do texto." },
  { subject: "portugues", deck: "Linguagens / Interpretação", front: "Ironia", back: "Ocorre quando o sentido pretendido contrasta com o sentido literal." },
  { subject: "portugues", deck: "Linguagens / Gramática", front: "Conjunção adversativa", back: "Expressa oposição: mas, porém, contudo, entretanto, todavia." },
  { subject: "portugues", deck: "Linguagens / Gramática", front: "Conjunção conclusiva", back: "Expressa conclusão: portanto, logo, assim, por isso." },
  { subject: "portugues", deck: "Redação ENEM", front: "Competência 1 da redação", back: "Avalia domínio da modalidade escrita formal da língua portuguesa." },
  { subject: "portugues", deck: "Redação ENEM", front: "Competência 2 da redação", back: "Avalia compreensão do tema, repertório sociocultural e atendimento ao tipo dissertativo-argumentativo." },
  { subject: "portugues", deck: "Redação ENEM", front: "Competência 3 da redação", back: "Avalia seleção, organização e defesa de argumentos." },
  { subject: "portugues", deck: "Redação ENEM", front: "Competência 4 da redação", back: "Avalia coesão textual: conectivos, progressão e articulação entre ideias." },
  { subject: "portugues", deck: "Redação ENEM", front: "Competência 5 da redação", back: "Avalia proposta de intervenção completa, com agente, ação, modo/meio, efeito/finalidade e detalhamento." },
  { subject: "humanas", deck: "Humanas / História", front: "República Oligárquica", back: "Período marcado pelo domínio político das oligarquias estaduais, coronelismo e voto de cabresto." },
  { subject: "humanas", deck: "Humanas / História", front: "Era Vargas", back: "Período de centralização política, industrialização e criação de direitos trabalhistas." },
  { subject: "humanas", deck: "Humanas / História", front: "Ditadura Militar no Brasil", back: "Regime autoritário iniciado em 1964, com censura, repressão política e restrição de direitos." },
  { subject: "humanas", deck: "Humanas / Geografia", front: "Urbanização", back: "Processo de crescimento da população urbana em relação à população rural." },
  { subject: "humanas", deck: "Humanas / Geografia", front: "Êxodo rural", back: "Migração do campo para a cidade, geralmente associada à mecanização agrícola e busca por emprego." },
  { subject: "humanas", deck: "Humanas / Geografia", front: "Ilha de calor", back: "Aumento da temperatura em áreas urbanas por excesso de concreto, asfalto, poluição e pouca vegetação." },
  { subject: "humanas", deck: "Humanas / Filosofia e Sociologia", front: "Cidadania", back: "Conjunto de direitos e deveres que permitem participação social, política e civil." },
  { subject: "humanas", deck: "Humanas / Filosofia e Sociologia", front: "Etnocentrismo", back: "Visão que julga outras culturas a partir dos valores da própria cultura." },
  { subject: "humanas", deck: "Humanas / Filosofia e Sociologia", front: "Indústria cultural", back: "Conceito associado à produção massificada de cultura como mercadoria." },
  { subject: "etec", deck: "ETEC / Matemática básica", front: "Regra de três simples", back: "Use quando duas grandezas são proporcionais. Monte a proporção e resolva por multiplicação cruzada." },
  { subject: "etec", deck: "ETEC / Matemática básica", front: "Porcentagem rápida", back: "10% é dividir por 10; 5% é metade de 10%; 1% é dividir por 100." },
  { subject: "etec", deck: "ETEC / Matemática básica", front: "MMC", back: "Mínimo múltiplo comum: útil para somar frações com denominadores diferentes." },
  { subject: "etec", deck: "ETEC / Matemática básica", front: "MDC", back: "Máximo divisor comum: útil para simplificar frações e resolver divisibilidade." },
  { subject: "etec", deck: "ETEC / Ciências", front: "Mistura homogênea", back: "Apresenta uma única fase visível, como água com sal dissolvido." },
  { subject: "etec", deck: "ETEC / Ciências", front: "Mistura heterogênea", back: "Apresenta duas ou mais fases visíveis, como água e óleo." },
  { subject: "etec", deck: "ETEC / Português", front: "Tema de um texto", back: "É o assunto geral abordado. Não confunda com opinião do autor." },
  { subject: "etec", deck: "ETEC / Português", front: "Tese", back: "É o ponto de vista defendido pelo autor." },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const globalForFlashcards = globalThis as unknown as {
  estudakiFlashcardSeed?: Promise<void>;
};

async function seedCuratedFlashcards() {
  await db.flashcard.deleteMany({ where: { source: "ANKI_DATA" } });

  const existing = await db.flashcard.count({ where: { source: "ESTUDAKI_CURATED" } });
  if (existing >= curatedCards.length) return;

  const subjects = new Map<string, { id: string; slug: string }>();
  for (const slug of Array.from(new Set(curatedCards.map((card) => card.subject)))) {
    const meta = subjectMeta[slug];
    const subject = await db.subject.upsert({
      where: { slug },
      update: { name: meta.name, color: meta.color },
      create: { slug, name: meta.name, color: meta.color },
      select: { id: true, slug: true },
    });
    subjects.set(slug, subject);
  }

  const topics = new Map<string, string>();
  for (const card of curatedCards) {
    const subject = subjects.get(card.subject);
    if (!subject) continue;
    const topicKey = `${subject.id}:${card.deck}`;
    if (topics.has(topicKey)) continue;

    const topicSlug = `flash-${subject.slug}-${normalize(card.deck)}`.slice(0, 180);
    const topic = await db.topic.upsert({
      where: { slug: topicSlug },
      update: { name: card.deck, subjectId: subject.id },
      create: { slug: topicSlug, name: card.deck, subjectId: subject.id },
      select: { id: true },
    });
    topics.set(topicKey, topic.id);
  }

  await db.flashcard.deleteMany({ where: { source: "ESTUDAKI_CURATED" } });

  const data = curatedCards.flatMap((card) => {
    const subject = subjects.get(card.subject);
    if (!subject) return [];
    return {
      subjectId: subject.id,
      topicId: topics.get(`${subject.id}:${card.deck}`) ?? null,
      deck: card.deck,
      source: "ESTUDAKI_CURATED",
      front: card.front,
      back: card.back,
      shared: true,
      status: ContentStatus.PUBLISHED,
    };
  });

  await db.flashcard.createMany({ data });
}

export async function ensureAnkiFlashcards() {
  globalForFlashcards.estudakiFlashcardSeed ??= seedCuratedFlashcards().catch((error) => {
    globalForFlashcards.estudakiFlashcardSeed = undefined;
    console.error("Falha ao garantir flashcards curados", error);
  });
  await globalForFlashcards.estudakiFlashcardSeed;
}
