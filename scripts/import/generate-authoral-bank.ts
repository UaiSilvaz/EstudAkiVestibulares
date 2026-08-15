import { promises as fs } from "node:fs";
import path from "node:path";
import {
  assignCorrectAlternative,
  countBy,
  difficultyForIndex,
  questionHash,
  type BankDifficulty,
  type BankQuestion,
  type ValidationIssue,
  validateQuestion,
} from "./question-bank-core";

const OUTPUT_DIR = path.resolve("scripts/import/output");
const CURRENT_COLLECTION_YEAR = 2026;

type DraftBody = Pick<
  BankQuestion,
  "subject" | "topic" | "statement" | "supportText" | "skill" | "pedagogyComment" | "templateId"
> & {
  options: Array<{ text: string; explanation: string }>;
  correctIndex: number;
  solution: string;
  tags?: string[];
};

type Generator = (seed: number, vestibular: string, difficulty: BankDifficulty) => DraftBody;

const targets: Record<string, number> = {
  ENEM: 1200,
  ETEC: 900,
  FATEC: 900,
  FUVEST: 900,
  UNESP: 900,
  UNICAMP: 900,
  "Provão Paulista": 900,
};

const allowedSubjects: Record<string, string[]> = {
  ENEM: ["Matemática", "Português", "Literatura", "História", "Geografia", "Física", "Química", "Biologia", "Filosofia", "Sociologia", "Inglês"],
  ETEC: ["Matemática", "Português", "História", "Geografia", "Física", "Química", "Biologia", "Inglês", "Raciocínio Lógico"],
  FATEC: ["Matemática", "Português", "História", "Geografia", "Física", "Química", "Biologia", "Inglês", "Raciocínio Lógico"],
  FUVEST: ["Matemática", "Português", "Literatura", "História", "Geografia", "Física", "Química", "Biologia", "Filosofia", "Sociologia", "Inglês"],
  UNESP: ["Matemática", "Português", "Literatura", "História", "Geografia", "Física", "Química", "Biologia", "Filosofia", "Sociologia", "Inglês"],
  UNICAMP: ["Matemática", "Português", "Literatura", "História", "Geografia", "Física", "Química", "Biologia", "Filosofia", "Sociologia", "Inglês"],
  "Provão Paulista": ["Matemática", "Português", "Literatura", "História", "Geografia", "Física", "Química", "Biologia", "Filosofia", "Sociologia", "Inglês"],
};

function integer(seed: number, min: number, max: number) {
  const x = Math.sin(seed * 9301 + 49297) * 10000;
  return min + Math.floor((x - Math.floor(x)) * (max - min + 1));
}

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(integer(seed, 0, items.length - 1))];
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function decimal(value: number, digits = 1) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function styleLead(vestibular: string, seed: number) {
  const applied = [
    "Uma equipe escolar analisou uma situação concreta e precisou justificar a decisão com base nos dados apresentados.",
    "Em uma atividade de investigação, os estudantes compararam informações antes de formular uma conclusão.",
    "Um relatório técnico resumiu um problema cotidiano que exige interpretação cuidadosa, e não apenas memorização.",
    "Durante o planejamento de uma ação pública, diferentes hipóteses foram confrontadas com evidências mensuráveis.",
  ];
  const analytical = [
    "Considere a situação descrita e examine as relações conceituais envolvidas antes de escolher a conclusão mais consistente.",
    "A resolução exige articular os dados do enunciado com o princípio teórico pertinente, evitando generalizações indevidas.",
    "O problema a seguir combina leitura crítica e domínio conceitual; a resposta deve decorrer necessariamente das premissas.",
  ];
  return pick(["FUVEST", "UNESP", "UNICAMP"].includes(vestibular) ? analytical : applied, seed);
}

function option(text: string, explanation: string) {
  return { text, explanation };
}

const percentageGenerator: Generator = (seed, vestibular, difficulty) => {
  const base = integer(seed, 240, 960) * 10;
  const first = pick([8, 10, 12, 15, 20], seed + 1);
  const second = pick([5, 8, 10, 12], seed + 2);
  const afterFirst = base * (1 - first / 100);
  const final = afterFirst * (1 + second / 100);
  const naive = base * (1 - (first - second) / 100);
  const discountOnly = afterFirst;
  const addThenDiscount = base * (1 + second / 100) * (1 - first / 100);
  const difference = base - final;
  const question = difficulty === "HARD"
    ? `O setor financeiro precisa determinar a variação absoluta entre o valor inicial e o valor final, respeitando a incidência sucessiva dos percentuais.`
    : `Qual é o valor final registrado após as duas alterações sucessivas?`;
  return {
    subject: "Matemática",
    topic: "Porcentagem e variações sucessivas",
    templateId: `math-percent-successive-${difficulty.toLowerCase()}-${seed % 5}`,
    supportText: `Um curso preparatório custava ${money(base)}. Em uma campanha, recebeu desconto de ${first}% e, no mês seguinte, o preço já descontado sofreu reajuste de ${second}%.`,
    statement: `${styleLead(vestibular, seed)} ${question} Os percentuais devem ser aplicados sobre a base vigente em cada etapa.`,
    options: [
      option(difficulty === "HARD" ? money(difference) : money(final), `Resultado correto: primeiro se multiplica por ${decimal(1 - first / 100, 2)} e depois por ${decimal(1 + second / 100, 2)}; percentuais sucessivos não são somados diretamente.`),
      option(difficulty === "HARD" ? money(base - naive) : money(naive), "Este valor resulta da soma algébrica direta das taxas, procedimento inadequado porque a segunda taxa incide sobre uma nova base."),
      option(difficulty === "HARD" ? money(base - discountOnly) : money(discountOnly), "A conta considera apenas o desconto e ignora completamente o reajuste aplicado na segunda etapa."),
      option(difficulty === "HARD" ? money(Math.abs(base - addThenDiscount) + second) : money(addThenDiscount + second), "A ordem ou a unidade foi manipulada de forma inconsistente; os percentuais são fatores multiplicativos, e não valores em reais."),
      option(difficulty === "HARD" ? money(base * (first + second) / 100) : money(base), "A alternativa mantém a base original ou soma taxas sem observar que houve duas incidências sucessivas."),
    ],
    correctIndex: 0,
    solution: `Partindo de ${money(base)}, o desconto produz ${money(base)} × ${decimal(1 - first / 100, 2)} = ${money(afterFirst)}. Em seguida, o reajuste incide sobre esse resultado: ${money(afterFirst)} × ${decimal(1 + second / 100, 2)} = ${money(final)}. ${difficulty === "HARD" ? `Logo, a variação absoluta é ${money(base)} − ${money(final)} = ${money(difference)}.` : `Portanto, o valor final é ${money(final)}.`}`,
    skill: "Modelar variações percentuais sucessivas distinguindo taxas aditivas de fatores multiplicativos.",
    pedagogyComment: "O distrator principal reproduz o erro comum de somar desconto e reajuste. Recomenda-se registrar cada nova base antes de aplicar a taxa seguinte.",
  };
};

const linearGenerator: Generator = (seed, vestibular, difficulty) => {
  const fixed = integer(seed, 3, 12);
  const rate = integer(seed + 1, 2, 8);
  const usage = integer(seed + 2, 8, 30);
  const total = fixed + rate * usage;
  const target = total + rate * integer(seed + 3, 2, 9);
  const inverse = (target - fixed) / rate;
  const asksInverse = difficulty === "HARD";
  return {
    subject: "Matemática",
    topic: "Função afim e modelagem",
    templateId: `math-linear-model-${difficulty.toLowerCase()}-${seed % 5}`,
    supportText: `Um serviço comunitário cobra taxa fixa de ${money(fixed)} e ${money(rate)} por hora de uso. Em certo dia, um usuário permaneceu ${usage} horas. Para outra análise, considera-se também uma cobrança total de ${money(target)}.`,
    statement: `${styleLead(vestibular, seed)} ${asksInverse ? `Quantas horas correspondem à cobrança de ${money(target)}, segundo o mesmo modelo?` : `Qual expressão representa o custo C(h) e qual foi o valor pago pelas ${usage} horas?`}`,
    options: asksInverse
      ? [
          option(`${inverse} horas`, "Subtrai-se a taxa fixa do total e divide-se o restante pela taxa horária, isolando corretamente a variável."),
          option(`${target / rate} horas`, "A divisão direta ignora que parte do total corresponde à taxa fixa, que não varia com as horas."),
          option(`${(target - rate) / fixed} horas`, "A alternativa troca os papéis da taxa fixa e do coeficiente por hora na função afim."),
          option(`${inverse + fixed} horas`, "Somar a taxa fixa ao número de horas mistura grandezas distintas e não resolve a equação proposta."),
          option(`${Math.max(1, inverse - rate)} horas`, "Subtrair a taxa horária do resultado não possui justificativa algébrica no modelo C(h)=a+bh."),
        ]
      : [
          option(`C(h) = ${fixed} + ${rate}h; pagamento de ${money(total)}`, "A taxa fixa é o termo constante e o valor por hora é o coeficiente de h; a substituição fornece o total correto."),
          option(`C(h) = ${rate} + ${fixed}h; pagamento de ${money(rate + fixed * usage)}`, "Os coeficientes foram invertidos: a taxa fixa não multiplica o número de horas."),
          option(`C(h) = ${fixed * rate}h; pagamento de ${money(fixed * rate * usage)}`, "Multiplicar as duas tarifas elimina indevidamente a parcela fixa do modelo."),
          option(`C(h) = ${fixed}h + ${rate}h; pagamento de ${money((fixed + rate) * usage)}`, "A taxa fixa foi tratada como variável e cobrada novamente a cada hora."),
          option(`C(h) = ${fixed} + ${rate}; pagamento de ${money(fixed + rate)}`, "A expressão não depende de h e, portanto, não representa a variação do custo com o uso."),
        ],
    correctIndex: 0,
    solution: asksInverse
      ? `O modelo é C(h)=${fixed}+${rate}h. Igualando a ${target}, obtém-se ${target}=${fixed}+${rate}h; então ${rate}h=${target - fixed} e h=${inverse}. A unidade final é hora, coerente com a variável isolada.`
      : `O custo possui uma parcela constante de ${money(fixed)} e outra proporcional ao tempo: C(h)=${fixed}+${rate}h. Para h=${usage}, C(${usage})=${fixed}+${rate}×${usage}=${total}, ou ${money(total)}.`,
    skill: "Traduzir uma relação entre grandezas em uma função afim e interpretar seus coeficientes.",
    pedagogyComment: "A questão verifica se o aluno diferencia parcela fixa e taxa variável. Um bom procedimento é escrever as unidades ao lado de cada coeficiente.",
  };
};

const statisticsGenerator: Generator = (seed, vestibular, difficulty) => {
  const values = Array.from({ length: 5 }, (_, index) => integer(seed + index, 12, 28));
  const sum = values.reduce((total, value) => total + value, 0);
  const mean = sum / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[2];
  const replacement = integer(seed + 8, 30, 42);
  const newMean = (sum - values[0] + replacement) / values.length;
  const correct = difficulty === "HARD" ? newMean : mean;
  return {
    subject: "Matemática",
    topic: "Estatística descritiva",
    templateId: `math-statistics-${difficulty.toLowerCase()}-${seed % 5}`,
    supportText: `Os tempos, em minutos, gastos por cinco estudantes em uma atividade foram: ${values.join(", ")}. Em uma revisão do registro, o primeiro valor pode ser substituído por ${replacement}.`,
    statement: `${styleLead(vestibular, seed)} ${difficulty === "HARD" ? "Se a substituição for confirmada, qual será a nova média aritmética?" : "Qual é a média aritmética dos cinco tempos originalmente registrados?"} A resposta deve preservar a unidade da grandeza.`,
    options: [
      option(`${decimal(correct)} minutos`, "A soma dos cinco valores é dividida por cinco; na revisão, retira-se o valor antigo e inclui-se o novo antes da divisão."),
      option(`${decimal(median)} minutos`, "Esse resultado corresponde à mediana da lista ordenada, não à média aritmética solicitada."),
      option(`${decimal(sum)} minutos`, "A alternativa apresenta a soma dos dados e esquece de dividir pela quantidade de observações."),
      option(`${decimal(correct + 5)} minutos`, "Foi acrescentada uma variação arbitrária após o cálculo, sem correspondência com a definição de média."),
      option(`${decimal(Math.max(0, correct - values.length))} minutos`, "Subtrair o número de observações do resultado não faz parte do cálculo da média aritmética."),
    ],
    correctIndex: 0,
    solution: difficulty === "HARD"
      ? `A soma original é ${sum}. Com a correção, a nova soma vale ${sum}−${values[0]}+${replacement}=${sum - values[0] + replacement}. Dividindo por 5, a média corrigida é ${decimal(newMean)} minutos.`
      : `Somam-se os tempos: ${values.join("+")}=${sum}. Como existem cinco observações, a média é ${sum}/5=${decimal(mean)} minutos. Ordenar os valores só seria necessário para encontrar a mediana.`,
    skill: "Calcular e interpretar média aritmética, distinguindo-a de soma e mediana em um conjunto de dados.",
    pedagogyComment: "Os distratores foram construídos a partir de confusões frequentes entre soma, média e mediana. Peça ao aluno para nomear a medida antes de calcular.",
  };
};

const probabilityGenerator: Generator = (seed, vestibular, difficulty) => {
  const red = integer(seed, 3, 9);
  const blue = integer(seed + 1, 4, 10);
  const green = integer(seed + 2, 2, 7);
  const total = red + blue + green;
  const numerator = difficulty === "HARD" ? red * blue : red + green;
  const denominator = difficulty === "HARD" ? total * (total - 1) : total;
  const correctText = difficulty === "HARD" ? `${numerator}/${denominator}` : `${numerator}/${denominator}`;
  return {
    subject: "Matemática",
    topic: "Probabilidade",
    templateId: `math-probability-${difficulty.toLowerCase()}-${seed % 5}`,
    supportText: `Uma caixa contém ${red} cartões vermelhos, ${blue} azuis e ${green} verdes, indistinguíveis ao toque. Todos têm a mesma chance de serem retirados.`,
    statement: `${styleLead(vestibular, seed)} ${difficulty === "HARD" ? "Dois cartões são retirados sucessivamente, sem reposição. Qual é a probabilidade de sair primeiro um vermelho e depois um azul?" : "Um cartão é retirado ao acaso. Qual é a probabilidade de ele não ser azul?"}`,
    options: [
      option(correctText, "O espaço amostral e os casos favoráveis foram contados na mesma condição; sem reposição, o segundo denominador diminui uma unidade."),
      option(`${difficulty === "HARD" ? red + blue : blue}/${total}`, "A alternativa soma categorias ou calcula justamente o evento azul, trocando o evento pedido por outro."),
      option(`${difficulty === "HARD" ? red * blue : red + green}/${difficulty === "HARD" ? total * total : total - 1}`, "O denominador pressupõe reposição ou altera o total sem motivo, contrariando o procedimento descrito."),
      option(`${green}/${total}`, "Considerar apenas os cartões verdes exclui os vermelhos, que também pertencem ao evento não azul."),
      option(`${red}/${blue}`, "Uma razão entre duas cores não representa probabilidade quando o denominador deve contar todos os resultados possíveis."),
    ],
    correctIndex: 0,
    solution: difficulty === "HARD"
      ? `Na primeira retirada, P(vermelho)=${red}/${total}. Sem reposição, restam ${total - 1} cartões, dos quais ${blue} são azuis. Assim, P=${red}/${total}×${blue}/${total - 1}=${numerator}/${denominator}.`
      : `O evento “não azul” reúne vermelhos e verdes: ${red}+${green}=${numerator} casos favoráveis. Há ${total} cartões ao todo. Logo, a probabilidade é ${numerator}/${total}.`,
    skill: "Construir o espaço amostral e calcular probabilidades simples ou condicionadas sem reposição.",
    pedagogyComment: "A dificuldade central é definir corretamente o evento. Em retiradas sucessivas, recomenda-se atualizar o total antes do segundo fator.",
  };
};

const kinematicsGenerator: Generator = (seed, vestibular, difficulty) => {
  const speed = integer(seed, 12, 28);
  const time = integer(seed + 1, 8, 24);
  const acceleration = integer(seed + 2, 2, 5);
  const distanceUniform = speed * time;
  const distanceAccelerated = speed * time + (acceleration * time * time) / 2;
  const correct = difficulty === "HARD" ? distanceAccelerated : distanceUniform;
  return {
    subject: "Física",
    topic: "Cinemática",
    templateId: `physics-kinematics-${difficulty.toLowerCase()}-${seed % 5}`,
    supportText: `Um veículo de testes inicia o trecho com velocidade de ${speed} m/s e é observado durante ${time} s. ${difficulty === "HARD" ? `Nesse intervalo, mantém aceleração constante de ${acceleration} m/s².` : "No intervalo considerado, sua velocidade permanece constante."}`,
    statement: `${styleLead(vestibular, seed)} Desprezando o tempo de reação do equipamento, qual distância é percorrida no intervalo descrito?`,
    options: [
      option(`${decimal(correct)} m`, "A expressão cinemática adequada foi aplicada com unidades do SI e com o termo de aceleração apenas quando necessário."),
      option(`${decimal(speed + time)} m`, "Somar velocidade e tempo mistura grandezas de dimensões diferentes e não produz uma distância."),
      option(`${decimal(speed / time)} m`, "Dividir velocidade pelo tempo está relacionado a uma taxa de variação, não ao deslocamento no intervalo."),
      option(`${decimal(difficulty === "HARD" ? speed * time + acceleration * time : distanceUniform / 2)} m`, "A alternativa omite o fator quadrático do tempo ou reduz sem justificativa o movimento uniforme."),
      option(`${decimal(difficulty === "HARD" ? acceleration * time * time : time)} m`, "O cálculo ignora a velocidade inicial ou confunde o próprio tempo com uma medida de distância."),
    ],
    correctIndex: 0,
    solution: difficulty === "HARD"
      ? `Para movimento uniformemente variado, Δs=v₀t+at²/2. Substituindo: Δs=${speed}×${time}+${acceleration}×${time}²/2=${decimal(distanceAccelerated)} m. As unidades são coerentes com deslocamento.`
      : `No movimento uniforme, Δs=v×t. Assim, Δs=${speed}×${time}=${distanceUniform} m. Não é necessário usar aceleração, pois a velocidade é constante.`,
    skill: "Selecionar e aplicar o modelo cinemático coerente com movimento uniforme ou uniformemente variado.",
    pedagogyComment: "A questão penaliza o uso automático de fórmulas. Antes do cálculo, o aluno deve identificar se a velocidade é constante ou se há aceleração.",
  };
};

const electricityGenerator: Generator = (seed, vestibular, difficulty) => {
  const voltage = integer(seed, 6, 24);
  const resistance = integer(seed + 1, 2, 12);
  const current = voltage / resistance;
  const power = voltage * current;
  const correct = difficulty === "HARD" ? power : current;
  return {
    subject: "Física",
    topic: "Eletricidade e potência",
    templateId: `physics-ohm-power-${difficulty.toLowerCase()}-${seed % 5}`,
    supportText: `Um componente ôhmico de resistência ${resistance} Ω é ligado a uma fonte ideal de ${voltage} V. Considere fios de resistência desprezível e funcionamento em regime permanente.`,
    statement: `${styleLead(vestibular, seed)} ${difficulty === "HARD" ? "Qual é a potência elétrica dissipada pelo componente?" : "Qual é a intensidade da corrente elétrica no componente?"}`,
    options: [
      option(`${decimal(correct, 2)} ${difficulty === "HARD" ? "W" : "A"}`, "A Lei de Ohm fornece I=V/R; para potência, usa-se P=VI após determinar a corrente."),
      option(`${decimal(voltage * resistance, 2)} ${difficulty === "HARD" ? "W" : "A"}`, "Multiplicar diretamente tensão por resistência não corresponde à Lei de Ohm nem preserva a unidade pedida."),
      option(`${decimal(resistance / voltage, 2)} ${difficulty === "HARD" ? "W" : "A"}`, "A razão foi invertida; para um resistor ôhmico, a corrente é tensão dividida pela resistência."),
      option(`${decimal(voltage + resistance, 2)} ${difficulty === "HARD" ? "W" : "A"}`, "Somar valores de grandezas diferentes não tem significado físico neste circuito."),
      option(`${decimal(difficulty === "HARD" ? current : power, 2)} ${difficulty === "HARD" ? "W" : "A"}`, "O valor corresponde a outra grandeza do circuito e foi apresentado com unidade incompatível com o que se pede."),
    ],
    correctIndex: 0,
    solution: `Pela Lei de Ohm, I=V/R=${voltage}/${resistance}=${decimal(current, 2)} A. ${difficulty === "HARD" ? `A potência vale P=VI=${voltage}×${decimal(current, 2)}=${decimal(power, 2)} W.` : `Como a pergunta solicita corrente, o resultado final é ${decimal(current, 2)} A.`}`,
    skill: "Relacionar tensão, resistência, corrente e potência em um circuito ôhmico simples.",
    pedagogyComment: "Os distratores misturam operações e unidades. Escrever a fórmula acompanhada das unidades ajuda a identificar resultados fisicamente impossíveis.",
  };
};

const chemistryGenerator: Generator = (seed, vestibular, difficulty) => {
  const concentration = integer(seed, 2, 12) / 10;
  const volume = integer(seed + 1, 2, 8) / 10;
  const moles = concentration * volume;
  const molarMass = pick([40, 58.5, 98, 180], seed + 2);
  const mass = moles * molarMass;
  const asksMass = difficulty === "HARD";
  return {
    subject: "Química",
    topic: "Concentração e quantidade de matéria",
    templateId: `chemistry-concentration-${difficulty.toLowerCase()}-${seed % 5}`,
    supportText: `Uma solução aquosa apresenta concentração de ${decimal(concentration)} mol/L e volume de ${decimal(volume)} L. Para o soluto considerado, a massa molar é ${decimal(molarMass)} g/mol.`,
    statement: `${styleLead(vestibular, seed)} ${asksMass ? "Qual massa de soluto está presente nessa porção da solução?" : "Qual quantidade de matéria do soluto está presente nessa porção?"}`,
    options: [
      option(`${decimal(asksMass ? mass : moles, 2)} ${asksMass ? "g" : "mol"}`, "Primeiro aplica-se n=C·V; quando se pede massa, multiplica-se a quantidade de matéria pela massa molar."),
      option(`${decimal(concentration / volume, 2)} ${asksMass ? "g" : "mol"}`, "A divisão entre concentração e volume não corresponde à definição C=n/V reorganizada para n."),
      option(`${decimal(concentration + volume, 2)} ${asksMass ? "g" : "mol"}`, "Somar concentração e volume combina grandezas com unidades incompatíveis."),
      option(`${decimal(asksMass ? moles : mass, 2)} ${asksMass ? "g" : "mol"}`, "O valor pertence à etapa intermediária ou final oposta e foi associado à unidade errada."),
      option(`${decimal(asksMass ? concentration * molarMass : volume * molarMass, 2)} ${asksMass ? "g" : "mol"}`, "O cálculo omite um dos fatores necessários e, por isso, não representa a porção efetivamente analisada."),
    ],
    correctIndex: 0,
    solution: `A definição de concentração molar é C=n/V, portanto n=C·V=${decimal(concentration)}×${decimal(volume)}=${decimal(moles, 2)} mol. ${asksMass ? `A massa é m=n·M=${decimal(moles, 2)}×${decimal(molarMass)}=${decimal(mass, 2)} g.` : `A quantidade de matéria solicitada é ${decimal(moles, 2)} mol.`}`,
    skill: "Usar concentração molar, volume e massa molar em uma cadeia coerente de conversões químicas.",
    pedagogyComment: "A atividade exige atenção às unidades de volume e às etapas n=C·V e m=n·M. O aluno deve evitar aplicar todas as grandezas em uma única operação sem significado.",
  };
};

const geneticsGenerator: Generator = (seed, vestibular, difficulty) => {
  const affected = pick(["uma condição recessiva", "a ausência de uma enzima funcional", "um fenótipo autossômico recessivo"], seed);
  const probability = difficulty === "HARD" ? "3/16" : "1/4";
  return {
    subject: "Biologia",
    topic: "Genética mendeliana",
    templateId: `biology-genetics-${difficulty.toLowerCase()}-${seed % 5}`,
    supportText: `Em uma espécie diploide, ${affected} é determinada pelo genótipo aa. Um casal heterozigoto para o gene analisado planeja ter descendentes. Em cada nascimento, os eventos genéticos são independentes.`,
    statement: `${styleLead(vestibular, seed)} ${difficulty === "HARD" ? "Qual é a probabilidade de os dois primeiros descendentes apresentarem fenótipos diferentes, sendo o primeiro afetado e o segundo não afetado?" : "Qual é a probabilidade de um descendente apresentar o fenótipo recessivo?"}`,
    options: [
      option(probability, "No cruzamento Aa×Aa, P(aa)=1/4 e P(não afetado)=3/4; quando há ordem definida, multiplicam-se os eventos correspondentes."),
      option("1/2", "Esse valor confunde segregação dos alelos com frequência do genótipo recessivo no cruzamento entre heterozigotos."),
      option("3/4", "A fração representa os descendentes não afetados em um único nascimento, não o evento solicitado."),
      option(difficulty === "HARD" ? "3/16" : "1/3", "A combinação usa denominador ou ordem incompatível com as proporções mendelianas do cruzamento Aa×Aa."),
      option(difficulty === "HARD" ? "1/16" : "1", "A alternativa trata os eventos de forma excessivamente restritiva ou supõe certeza para um resultado probabilístico."),
    ],
    correctIndex: 0,
    solution: difficulty === "HARD"
      ? `O quadro de Punnett para Aa×Aa produz 1/4 de aa e 3/4 de não afetados. Como a ordem foi fixada, P(primeiro afetado e segundo não afetado)=1/4×3/4=3/16. Para manter o gabarito coerente, compare a fração obtida com as alternativas e identifique a equivalente.`
      : `No cruzamento Aa×Aa, os genótipos esperados são 1/4 AA, 1/2 Aa e 1/4 aa. Apenas aa expressa o fenótipo recessivo; logo, a probabilidade é 1/4.`,
    skill: "Aplicar segregação mendeliana e independência entre nascimentos na resolução de probabilidades genéticas.",
    pedagogyComment: "A questão foi construída para separar frequência de alelos, frequência de genótipos e probabilidade de sequências. Recomenda-se montar o cruzamento antes de multiplicar eventos.",
  };
};

type ConceptCard = {
  subject: string;
  topic: string;
  principle: string;
  correct: string;
  distractors: string[];
  skill: string;
};

const conceptCards: ConceptCard[] = [
  { subject: "Português", topic: "Coesão e referenciação", principle: "um pronome retoma um termo anterior e evita repetição sem alterar o referente", correct: "O recurso mantém a continuidade temática ao retomar uma informação já introduzida.", distractors: ["O recurso inaugura um referente sem qualquer relação com o período anterior.", "O pronome elimina a necessidade de coerência entre as partes do texto.", "A retomada transforma uma opinião em dado estatístico verificável.", "O mecanismo altera o tempo verbal e, por isso, muda obrigatoriamente o assunto."], skill: "Analisar mecanismos de coesão referencial e seus efeitos na progressão textual." },
  { subject: "Português", topic: "Variação linguística", principle: "a adequação depende da situação comunicativa e não estabelece superioridade intrínseca entre variedades", correct: "A escolha linguística pode ser adequada ao contexto mesmo quando difere da norma formal.", distractors: ["Toda variedade não padrão impede necessariamente a comunicação.", "A norma formal deve substituir as demais variedades em qualquer interação.", "A variação ocorre apenas por desconhecimento individual de regras gramaticais.", "As diferenças de fala desaparecem quando os interlocutores pertencem à mesma faixa etária."], skill: "Reconhecer variação linguística e adequação de registro sem reproduzir preconceito linguístico." },
  { subject: "Português", topic: "Argumentação", principle: "uma tese precisa ser sustentada por razões pertinentes e evidências relacionadas", correct: "A força do argumento depende da relação entre a evidência apresentada e a conclusão defendida.", distractors: ["Uma conclusão se torna válida apenas por ser repetida diversas vezes.", "O uso de linguagem enfática substitui a necessidade de apresentar evidências.", "Qualquer dado numérico comprova qualquer tese, independentemente de sua origem.", "A discordância do leitor elimina automaticamente a coerência interna do argumento."], skill: "Avaliar a pertinência de evidências e a consistência entre premissas e conclusão." },
  { subject: "Literatura", topic: "Realismo", principle: "a narrativa realista examina criticamente relações sociais e contradições das personagens", correct: "A representação evita idealização e usa o conflito individual para expor tensões sociais.", distractors: ["A narrativa substitui a observação social por exaltação heroica sem contradições.", "O texto abandona causalidade e se limita a descrever paisagens míticas.", "A personagem é apresentada como modelo moral perfeito e imune ao meio social.", "O conflito existe apenas para confirmar uma visão sentimental idealizada do amor."], skill: "Relacionar procedimentos narrativos realistas à crítica social e à construção não idealizada das personagens." },
  { subject: "Literatura", topic: "Modernismo brasileiro", principle: "a experimentação modernista rompe convenções e incorpora criticamente linguagens do cotidiano", correct: "A ruptura formal pode aproximar o texto da fala cotidiana e questionar modelos culturais importados.", distractors: ["A inovação exige eliminar qualquer referência à realidade brasileira.", "O movimento restaura integralmente as regras clássicas como reação à linguagem popular.", "A presença de oralidade impede que o texto produza reflexão estética.", "A crítica cultural se limita a copiar modelos europeus sem transformação local."], skill: "Interpretar ruptura formal, oralidade e revisão crítica da identidade cultural no Modernismo." },
  { subject: "História", topic: "Industrialização e trabalho", principle: "a industrialização reorganiza produção, tempo de trabalho e conflitos sociais", correct: "A disciplina fabril altera ritmos de vida e favorece novas formas de organização dos trabalhadores.", distractors: ["A mecanização elimina imediatamente jornadas extensas e conflitos por direitos.", "O trabalho assalariado torna desnecessária qualquer negociação coletiva.", "A fábrica preserva integralmente a autonomia do artesão sobre ritmo e produto.", "A urbanização industrial distribui renda de maneira automática e homogênea."], skill: "Relacionar transformações produtivas a mudanças sociais, urbanas e políticas no mundo do trabalho." },
  { subject: "História", topic: "Brasil República", principle: "cidadania e participação política resultam de disputas e não de concessões lineares", correct: "A ampliação de direitos decorre de mobilização social, negociação institucional e conflitos históricos.", distractors: ["Os direitos políticos avançam sempre de forma contínua e sem retrocessos.", "A legislação produz igualdade material imediata, independentemente de sua aplicação.", "A cidadania brasileira foi concluída no início da República e permaneceu inalterada.", "Movimentos sociais têm papel apenas simbólico e não interferem em mudanças institucionais."], skill: "Compreender cidadania como construção histórica marcada por disputas, avanços e limites." },
  { subject: "História", topic: "Colonização e economia atlântica", principle: "a colonização articulou coerção do trabalho, comércio atlântico e acumulação metropolitana", correct: "A produção colonial integrou circuitos externos e se sustentou em relações compulsórias de trabalho.", distractors: ["A economia colonial funcionou de modo isolado e voltado apenas ao consumo local.", "O trabalho compulsório teve importância marginal na produção exportadora.", "As metrópoles proibiam a circulação atlântica de mercadorias coloniais.", "A colonização eliminou hierarquias sociais ao uniformizar juridicamente a população."], skill: "Analisar a inserção da colonização americana em redes atlânticas de comércio, poder e trabalho." },
  { subject: "Geografia", topic: "Urbanização e segregação", principle: "o espaço urbano expressa desigualdades de acesso a infraestrutura, moradia e mobilidade", correct: "A distância dos serviços e o custo do deslocamento revelam uma distribuição desigual dos recursos urbanos.", distractors: ["A expansão da cidade garante acesso homogêneo a equipamentos públicos.", "A segregação depende apenas de escolhas individuais sem relação com renda ou políticas urbanas.", "A valorização imobiliária reduz automaticamente o custo de moradia nas áreas centrais.", "A existência de transporte coletivo elimina diferenças territoriais de oportunidade."], skill: "Interpretar desigualdades socioespaciais a partir de mobilidade, moradia e oferta de serviços." },
  { subject: "Geografia", topic: "Clima e uso do solo", principle: "impermeabilização e retirada de vegetação alteram escoamento e temperatura urbana", correct: "Menor infiltração aumenta o escoamento superficial, enquanto a redução de vegetação favorece ilhas de calor.", distractors: ["A impermeabilização amplia a recarga do solo e reduz enchentes em qualquer situação.", "A retirada de vegetação diminui a temperatura por aumentar a absorção do concreto.", "O uso do solo não interfere no balanço térmico nem no ciclo local da água.", "A expansão de vias pavimentadas aumenta a evapotranspiração e elimina picos de vazão."], skill: "Relacionar cobertura do solo, drenagem urbana, balanço térmico e riscos ambientais." },
  { subject: "Geografia", topic: "Globalização e redes", principle: "fluxos globais são seletivos e dependem de infraestrutura, poder econômico e regulação", correct: "A integração em redes globais ocorre de forma desigual, concentrando funções de comando em alguns territórios.", distractors: ["A circulação global elimina diferenças entre centros e periferias.", "Todas as regiões participam dos fluxos com a mesma capacidade de decisão.", "A conectividade digital torna desnecessária qualquer infraestrutura material.", "A globalização impede políticas nacionais e locais de influenciar atividades econômicas."], skill: "Analisar a seletividade territorial das redes técnicas, produtivas e financeiras contemporâneas." },
  { subject: "Biologia", topic: "Ecologia e cadeias alimentares", principle: "energia diminui entre níveis tróficos, enquanto matéria circula nos ecossistemas", correct: "A transferência energética é limitada e explica a menor biomassa possível em níveis tróficos superiores.", distractors: ["A energia é reciclada integralmente pelos decompositores e retorna aos produtores.", "Consumidores superiores recebem mais energia por concentrarem indivíduos maiores.", "Matéria e energia seguem ciclos idênticos e permanecem constantes em cada nível.", "A fotossíntese transfere energia diretamente dos decompositores aos herbívoros."], skill: "Distinguir fluxo de energia e ciclagem de matéria em relações tróficas." },
  { subject: "Biologia", topic: "Evolução", principle: "seleção natural altera frequências de características herdáveis sob pressões ambientais", correct: "Indivíduos com variantes vantajosas tendem a deixar mais descendentes, modificando a população ao longo das gerações.", distractors: ["O ambiente produz mutações dirigidas exatamente para atender à necessidade do organismo.", "Cada indivíduo modifica geneticamente seu corpo por esforço e transmite a alteração adquirida.", "A seleção natural escolhe conscientemente os organismos mais complexos.", "Todas as variantes surgem com a mesma frequência porque a adaptação elimina o acaso."], skill: "Explicar adaptação populacional por variação herdável, sucesso reprodutivo diferencial e tempo geracional." },
  { subject: "Biologia", topic: "Fisiologia humana", principle: "homeostase depende de mecanismos de regulação que respondem a desvios internos", correct: "A resposta fisiológica tende a reduzir o desvio e restabelecer uma faixa funcional do organismo.", distractors: ["A homeostase mantém todas as variáveis em valor absolutamente fixo.", "O organismo só reage depois que o desvio deixa de produzir qualquer efeito celular.", "Mecanismos regulatórios ampliam indefinidamente toda mudança inicial.", "A regulação interna independe de comunicação hormonal ou nervosa."], skill: "Interpretar mecanismos de retroalimentação e manutenção do equilíbrio interno." },
  { subject: "Química", topic: "Equilíbrio químico", principle: "perturbações deslocam o equilíbrio no sentido que atenua seu efeito, sem alterar a constante se a temperatura não muda", correct: "A composição pode se ajustar à perturbação, mas a constante de equilíbrio permanece a mesma em temperatura constante.", distractors: ["Adicionar reagente aumenta necessariamente a constante de equilíbrio.", "O sistema em equilíbrio deixa de apresentar reações em nível molecular.", "Um catalisador desloca o equilíbrio para o lado com maior número de mols.", "A retirada de produto impede qualquer nova formação dessa espécie."], skill: "Analisar deslocamentos de equilíbrio distinguindo composição, velocidade e constante de equilíbrio." },
  { subject: "Química", topic: "Oxirredução", principle: "oxidação envolve perda de elétrons e redução envolve ganho, ocorrendo simultaneamente", correct: "A espécie que perde elétrons atua como agente redutor porque provoca a redução da outra.", distractors: ["A espécie oxidada ganha elétrons e atua obrigatoriamente como agente oxidante.", "Oxidação e redução podem ocorrer isoladamente sem transferência eletrônica global.", "O agente redutor é sempre a espécie com maior número de átomos.", "A variação do número de oxidação independe do balanço de elétrons."], skill: "Identificar oxidação, redução e agentes a partir da transferência de elétrons." },
  { subject: "Física", topic: "Energia mecânica", principle: "forças dissipativas transformam energia mecânica em outras formas, embora a energia total se conserve", correct: "A diminuição da energia mecânica pode corresponder ao aumento de energia interna por atrito.", distractors: ["O atrito destrói energia e viola necessariamente a conservação da energia total.", "A energia mecânica sempre permanece constante, independentemente das forças presentes.", "A energia interna só pode diminuir quando existe atrito entre superfícies.", "Toda perda de energia potencial se converte exclusivamente em energia cinética."], skill: "Distinguir conservação da energia total e conservação da energia mecânica em sistemas com dissipação." },
  { subject: "Física", topic: "Ondas", principle: "frequência é determinada pela fonte e velocidade depende do meio; ao mudar de meio, o comprimento de onda se ajusta", correct: "Mantida a fonte, a frequência não muda, e o comprimento de onda varia com a velocidade no novo meio.", distractors: ["A frequência muda obrigatoriamente para manter o comprimento de onda constante.", "A velocidade de propagação é determinada apenas pela amplitude da onda.", "Comprimento de onda e frequência aumentam sempre juntos em qualquer mudança de meio.", "A passagem entre meios interrompe a relação v=λf."], skill: "Relacionar frequência, velocidade e comprimento de onda em mudanças de meio." },
  { subject: "Inglês", topic: "Reading comprehension", principle: "a conclusão deve ser inferida de marcas textuais e não de tradução palavra por palavra", correct: "The conclusion is supported by contextual clues and by the relation between the sentences.", distractors: ["The conclusion depends only on a word that looks similar in Portuguese.", "The text states the opposite because every modal verb expresses certainty.", "The main idea can be identified without considering connectors or reference words.", "The author changes the topic completely whenever a new paragraph begins."], skill: "Inferir informação e identificar relações discursivas em texto curto de língua inglesa." },
  { subject: "Filosofia", topic: "Ética e ação", principle: "avaliar uma ação pode envolver intenção, regra, consequências e responsabilidade", correct: "A análise ética exige justificar o critério adotado e examinar como ele orienta a decisão concreta.", distractors: ["Uma ação é ética sempre que produz vantagem imediata para quem a pratica.", "A discordância moral prova que nenhum argumento racional pode ser apresentado.", "A intenção torna irrelevantes todas as consequências previsíveis da ação.", "Uma regra é justa apenas por existir, independentemente de sua fundamentação."], skill: "Comparar critérios de avaliação moral e aplicá-los de modo argumentativamente consistente." },
  { subject: "Filosofia", topic: "Conhecimento e ciência", principle: "afirmações científicas dependem de métodos públicos, evidências e possibilidade de revisão", correct: "A confiabilidade aumenta quando procedimentos e dados podem ser criticados e reproduzidos por outras pessoas.", distractors: ["Uma afirmação se torna científica quando é defendida por uma pessoa famosa.", "Resultados científicos não podem ser revistos depois de publicados.", "A experiência pessoal isolada substitui controles e comparação sistemática.", "A existência de incerteza torna qualquer investigação equivalente a uma opinião."], skill: "Distinguir justificação científica, autoridade, experiência anedótica e revisão crítica." },
  { subject: "Sociologia", topic: "Cultura e identidade", principle: "identidades são construídas em relações sociais e podem combinar pertencimentos diversos", correct: "O pertencimento é produzido historicamente e pode ser negociado em diferentes contextos sociais.", distractors: ["A identidade é inteiramente biológica e permanece igual em todas as situações.", "Participar de um grupo impede qualquer vínculo simultâneo com outros coletivos.", "Práticas culturais são imutáveis porque não recebem influência histórica.", "Diferenças culturais resultam apenas de escolhas individuais sem dimensão social."], skill: "Analisar identidade e cultura como processos relacionais, históricos e plurais." },
  { subject: "Sociologia", topic: "Trabalho e desigualdade", principle: "o mercado de trabalho é influenciado por instituições, qualificação e desigualdades sociais", correct: "Oportunidades e remunerações refletem tanto condições econômicas quanto relações sociais e políticas públicas.", distractors: ["A renda depende exclusivamente do esforço individual em qualquer contexto.", "A escolarização elimina automaticamente todas as formas de desigualdade ocupacional.", "Instituições e legislação não interferem nas relações de trabalho.", "Mudanças tecnológicas afetam todas as ocupações da mesma maneira e no mesmo ritmo."], skill: "Relacionar estrutura social, instituições e transformações econômicas às desigualdades do trabalho." },
  { subject: "Raciocínio Lógico", topic: "Condições necessárias e suficientes", principle: "uma condição suficiente garante o resultado, enquanto uma necessária precisa estar presente", correct: "A conclusão só pode ser afirmada quando a direção da implicação é respeitada.", distractors: ["Toda implicação pode ser invertida sem alterar seu valor lógico.", "Uma condição necessária garante sozinha a ocorrência do resultado.", "Negar o antecedente permite concluir automaticamente a negação do consequente.", "Duas afirmações relacionadas são equivalentes mesmo quando apenas uma implica a outra."], skill: "Distinguir condição necessária, condição suficiente, recíproca e contrapositiva." },
];

const contextSettings = [
  "um conselho escolar comparou dois relatórios produzidos em momentos diferentes",
  "uma equipe de pesquisa de bairro reuniu depoimentos e indicadores antes de apresentar uma proposta",
  "estudantes organizaram um debate e precisaram escolher a interpretação que melhor respeitava as evidências",
  "um projeto interdisciplinar avaliou uma explicação inicial e quatro hipóteses concorrentes",
  "uma comissão analisou dados de campo para evitar uma conclusão baseada apenas em impressão pessoal",
  "um grupo de extensão transformou observações locais em um argumento a ser submetido à crítica pública",
];

function conceptGenerator(card: ConceptCard, cardIndex: number): Generator {
  return (seed, vestibular, difficulty) => {
    const context = pick(contextSettings, seed + cardIndex);
    const markerA = integer(seed + 4, 18, 47);
    const markerB = integer(seed + 5, 52, 89);
    const mode = Math.abs(seed) % 5;
    const commands = [
      "qual conclusão interpreta o caso sem extrapolar as informações disponíveis?",
      "qual alternativa apresenta a justificativa conceitualmente mais consistente para a diferença observada?",
      "qual leitura poderia integrar o parecer final sem confundir correlação, descrição e explicação?",
      "qual formulação respeita simultaneamente o conceito central e os limites das evidências reunidas?",
      "qual hipótese deve ser mantida após a eliminação de generalizações e inversões conceituais?",
    ];
    const options = [
      option(card.correct, `Esta leitura aplica corretamente o princípio de que ${card.principle}, mantendo relação direta com as evidências do caso.`),
      ...card.distractors.map((text, index) => option(text, `O distrator ${index + 1} generaliza, inverte ou ignora parte do princípio analisado; ele não explica de modo consistente os dados e as relações apresentados.`)),
    ];
    return {
      subject: card.subject,
      topic: card.topic,
      templateId: `concept-${cardIndex}-mode-${mode}-${card.topic.toLowerCase().replace(/\W+/g, "-")}`,
      supportText: `No caso analisado, ${context}. O primeiro registro reuniu ${markerA} ocorrências e o segundo, ${markerB}; a razão aproximada entre os registros é ${decimal(markerB / markerA, 2)}. Esses números indicam uma tendência, mas não dispensam interpretação conceitual.`,
      statement: `${styleLead(vestibular, seed)} Considerando o tema “${card.topic}” e o princípio de que ${card.principle}, ${commands[mode]}`,
      options,
      correctIndex: 0,
      solution: `A resposta correta é a que reconhece que ${card.principle}. Os números do texto-base indicam uma diferença observável, mas não autorizam conclusões absolutas nem relações causais não demonstradas. Por isso, a alternativa correta articula conceito e evidência. As demais opções foram construídas com erros recorrentes: inversão de relação, generalização indevida, apagamento do contexto ou substituição de justificativa por afirmação categórica.`,
      skill: card.skill,
      pedagogyComment: `Questão de nível ${difficulty === "EASY" ? "introdutório" : difficulty === "MEDIUM" ? "intermediário" : "avançado"}. O aluno deve primeiro identificar o princípio central e depois eliminar alternativas que afirmam mais do que os dados permitem.`,
      tags: ["interpretação", "aplicação conceitual"],
    };
  };
}

const baseGenerators: Generator[] = [
  percentageGenerator,
  linearGenerator,
  statisticsGenerator,
  probabilityGenerator,
  kinematicsGenerator,
  electricityGenerator,
  chemistryGenerator,
  geneticsGenerator,
  ...conceptCards.map(conceptGenerator),
];

function completeExplanation(body: DraftBody, correctKey: string) {
  const wrongSummary = body.options
    .filter((_, index) => index !== body.correctIndex)
    .map((item, index) => `${index + 1}) ${item.explanation}`)
    .join(" ");
  return `${body.solution} Portanto, a alternativa ${correctKey} é a única compatível com todas as condições do enunciado. Análise dos distratores: ${wrongSummary} Dica de estudo: transforme o comando em uma pergunta objetiva, registre os dados ou conceitos indispensáveis e só então compare as alternativas.`;
}

function buildQuestion(vestibular: string, index: number, generators: Generator[]): BankQuestion {
  const difficulty = difficultyForIndex(index);
  const generator = generators[index % generators.length];
  const seed = (index + 1) * 97 + vestibular.length * 1009;
  const body = generator(seed, vestibular, difficulty);
  const optionSet = assignCorrectAlternative(body.options, body.correctIndex, seed % 5);
  const externalId = `estudaki-autoral-${vestibular.toLowerCase().replace(/\W+/g, "-")}-${String(index + 1).padStart(4, "0")}`;
  const question: BankQuestion = {
    externalId,
    vestibular,
    year: CURRENT_COLLECTION_YEAR,
    exam: `Banco autoral EstudAki ${CURRENT_COLLECTION_YEAR}`,
    phase: "Treinamento",
    subject: body.subject,
    topic: body.topic,
    difficulty,
    sourceType: "AUTHORIAL",
    sourceName: "EstudAki",
    statement: body.statement,
    supportText: body.supportText,
    images: [],
    alternatives: optionSet.alternatives,
    correctAlternative: optionSet.correctAlternative,
    explanation: completeExplanation(body, optionSet.correctAlternative),
    skill: body.skill,
    pedagogyComment: body.pedagogyComment,
    tags: [vestibular, body.subject, body.topic, difficulty, "autoral", ...(body.tags ?? [])],
    status: "REVIEW",
    reviewState: "PENDING_REVIEW",
    reviewNotes: "Questão autoral gerada por template pedagógico; exige revisão humana antes da publicação.",
    contentHash: "",
    templateId: body.templateId,
  };
  question.contentHash = questionHash(question);
  return question;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const valid: BankQuestion[] = [];
  const issues: ValidationIssue[] = [];
  const hashes = new Set<string>();
  const externalIds = new Set<string>();
  let duplicates = 0;

  for (const [vestibular, target] of Object.entries(targets)) {
    const generators = baseGenerators.filter((generator, index) => {
      const probe = generator(index + 31, vestibular, "MEDIUM");
      return allowedSubjects[vestibular].includes(probe.subject);
    });
    let acceptedForExam = 0;
    let cursor = 0;
    while (acceptedForExam < target && cursor < target * 4) {
      const question = buildQuestion(vestibular, cursor, generators);
      const reasons = validateQuestion(question);
      if (hashes.has(question.contentHash) || externalIds.has(question.externalId)) {
        duplicates += 1;
      } else if (reasons.length) {
        issues.push({ externalId: question.externalId, reasons });
      } else {
        valid.push(question);
        hashes.add(question.contentHash);
        externalIds.add(question.externalId);
        acceptedForExam += 1;
      }
      cursor += 1;
    }
    if (acceptedForExam < target) {
      throw new Error(`${vestibular}: apenas ${acceptedForExam}/${target} questões passaram na validação.`);
    }
  }

  const result = {
    generatedAt: new Date().toISOString(),
    totalGenerated: valid.length + issues.length + duplicates,
    totalValid: valid.length,
    totalRejectedLowQuality: issues.length,
    totalDuplicates: duplicates,
    pendingReview: valid.length,
    byVestibular: countBy(valid, (item) => item.vestibular),
    bySubject: countBy(valid, (item) => item.subject),
    byTopic: countBy(valid, (item) => `${item.subject} > ${item.topic}`),
    byDifficulty: countBy(valid, (item) => item.difficulty),
    byTemplate: countBy(valid, (item) => item.templateId),
    withSupportText: valid.filter((item) => item.supportText).length,
    withImages: valid.filter((item) => item.images.length > 0).length,
  };

  await Promise.all([
    fs.writeFile(path.join(OUTPUT_DIR, "banco-extenso-questoes-validas.json"), JSON.stringify(valid), "utf8"),
    fs.writeFile(path.join(OUTPUT_DIR, "banco-extenso-questoes-com-erro.json"), JSON.stringify(issues, null, 2), "utf8"),
    fs.writeFile(path.join(OUTPUT_DIR, "questoes-autorais-result.json"), JSON.stringify(result, null, 2), "utf8"),
    fs.writeFile(path.join(OUTPUT_DIR, "banco-extenso-distribuicao.json"), JSON.stringify({
      byVestibular: result.byVestibular,
      bySubject: result.bySubject,
      byTopic: result.byTopic,
      byDifficulty: result.byDifficulty,
      byTemplate: result.byTemplate,
    }, null, 2), "utf8"),
  ]);

  const report = `# Relatório de questões autorais\n\n` +
    `Gerado em ${result.generatedAt}. Todas as questões são originais do EstudAki e permanecem em **REVIEW / PENDING_REVIEW** até revisão humana.\n\n` +
    `## Resumo\n\n` +
    `- Geradas: ${result.totalGenerated.toLocaleString("pt-BR")}\n` +
    `- Válidas estruturalmente: ${result.totalValid.toLocaleString("pt-BR")}\n` +
    `- Rejeitadas pela validação de qualidade: ${result.totalRejectedLowQuality.toLocaleString("pt-BR")}\n` +
    `- Duplicadas ignoradas: ${result.totalDuplicates.toLocaleString("pt-BR")}\n` +
    `- Com texto de apoio: ${result.withSupportText.toLocaleString("pt-BR")}\n` +
    `- Com imagem: ${result.withImages.toLocaleString("pt-BR")}\n\n` +
    `## Por vestibular\n\n${Object.entries(result.byVestibular).map(([key, value]) => `- ${key}: ${value.toLocaleString("pt-BR")}`).join("\n")}\n\n` +
    `## Por dificuldade\n\n${Object.entries(result.byDifficulty).map(([key, value]) => `- ${key}: ${value.toLocaleString("pt-BR")}`).join("\n")}\n\n` +
    `## Salvaguardas\n\n` +
    `- Nenhuma questão é publicada automaticamente.\n` +
    `- A fonte é sempre EstudAki e o tipo é sempre AUTHORIAL.\n` +
    `- Cada item possui cinco alternativas, um único gabarito, explicação geral, explicação por alternativa, habilidade e observação pedagógica.\n` +
    `- A validação estrutural não substitui revisão humana de conteúdo; os lotes devem ser aprovados gradualmente no CMS.\n`;
  await fs.writeFile(path.join(OUTPUT_DIR, "questoes-autorais-relatorio.md"), report, "utf8");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
