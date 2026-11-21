/**
 * As 20 perguntas originais da anamnese Flor de Lótus.
 * A redação de cada pergunta (campo `text`) é preservada integralmente.
 * Os subcampos/opções apenas organizam a resposta, sem alterar a pergunta.
 */

export type SubField = { key: string; label: string; type: "text" | "date" | "textarea"; required?: boolean };
export type ChoiceConfig = { options: string[]; detailsLabel?: string; detailsRequiredFor?: string[] };
export type CompositeConfig = { fields: SubField[] };

export type QuestionDef = {
  number: number;
  code: string;
  text: string;
  helpText?: string;
  category: string;
  summaryCategory: string;
  fieldType: "short_text" | "long_text" | "composite" | "choice";
  config?: CompositeConfig | ChoiceConfig;
  required: boolean;
  allowNotApplicable?: boolean;
  allowPreferNot?: boolean;
};

/** Etapas do questionário, na ordem de preenchimento. */
export const STEPS = [
  { key: "identificacao", title: "Identificação" },
  { key: "saude", title: "Saúde e queixas" },
  { key: "feminina", title: "Saúde feminina" },
  { key: "habitos", title: "Hábitos" },
  { key: "rotina", title: "Rotina" },
  { key: "sono", title: "Sono e corpo" },
  { key: "alimentacao", title: "Alimentação" },
  { key: "tratamento", title: "Tratamento" },
] as const;

/** Categorias do relatório resumido. */
export const SUMMARY_CATEGORIES = [
  "Identificação",
  "Principais queixas",
  "Histórico de saúde",
  "Saúde feminina",
  "Hábitos",
  "Rotina",
  "Sono e sistema excretor",
  "Atividade física",
  "Alimentação",
  "Abertura para tratamentos",
] as const;

const OPEN_OPTIONS: ChoiceConfig = {
  options: ["Sim", "Não", "Tenho dúvidas"],
  detailsLabel: "Se quiser, comente (opcional)",
};

export const QUESTIONS: QuestionDef[] = [
  {
    number: 1,
    code: "nome",
    text: "Qual seu nome completo e como você gosta de ser chamada?",
    category: "Identificação",
    summaryCategory: "Identificação",
    fieldType: "composite",
    config: {
      fields: [
        { key: "nomeCompleto", label: "Nome completo", type: "text", required: true },
        { key: "comoGostaDeSerChamada", label: "Como gosta de ser chamada", type: "text", required: true },
      ],
    },
    required: true,
  },
  {
    number: 2,
    code: "nascimento_residencia",
    text: "Escreva sua data de nascimento, o local de nascimento, a cidade onde mora atualmente e há quanto tempo.",
    category: "Identificação",
    summaryCategory: "Identificação",
    fieldType: "composite",
    config: {
      fields: [
        { key: "dataNascimento", label: "Data de nascimento", type: "date", required: true },
        { key: "localNascimento", label: "Local de nascimento", type: "text", required: true },
        { key: "cidadeAtual", label: "Cidade onde mora atualmente", type: "text", required: true },
        { key: "haQuantoTempo", label: "Há quanto tempo mora nessa cidade", type: "text", required: true },
      ],
    },
    required: true,
  },
  {
    number: 3,
    code: "queixas",
    text: "Quais as principais queixas que te motivaram a procurar o Ayurveda? Diga o que você sente sem se apegar ao nome da doença. Diga também há quanto tempo você tem essas queixas.",
    category: "Saúde e queixas",
    summaryCategory: "Principais queixas",
    fieldType: "long_text",
    required: true,
  },
  {
    number: 4,
    code: "tratamento_atual",
    text: "Você faz tratamento alopático ou homeopático? Em caso positivo, qual o diagnóstico, qual a medicação, em qual horário do dia você toma e há quanto tempo?",
    category: "Saúde e queixas",
    summaryCategory: "Histórico de saúde",
    fieldType: "choice",
    config: {
      options: ["Sim", "Não"],
      detailsLabel: "Em caso positivo: diagnóstico, medicação, horário em que toma e há quanto tempo",
      detailsRequiredFor: ["Sim"],
    },
    required: true,
    allowPreferNot: true,
  },
  {
    number: 5,
    code: "alergias",
    text: "Tem alergia/intolerância a algum alimento ou medicamento? É uma pessoa altamente sensível (PAS) a substâncias em geral?",
    category: "Saúde e queixas",
    summaryCategory: "Histórico de saúde",
    fieldType: "long_text",
    required: true,
  },
  {
    number: 6,
    code: "menstruacao",
    text: "Sua menarca (primeira menstruação) ocorreu com quantos anos? E como é sua relação com sua menstruação hoje? Descreva brevemente quantos dias dura seu ciclo, se você sente dor, se tem coágulos, qual a cor do sangue, qual o cheiro do sangue. Explique ainda se você usa absorvente descartável, absorvente interno, calcinhas absorventes, coletor menstrual ou outro método e se pratica sexo nos dias em que está menstruada.",
    category: "Saúde feminina",
    summaryCategory: "Saúde feminina",
    fieldType: "long_text",
    required: true,
    allowNotApplicable: true,
    allowPreferNot: true,
  },
  {
    number: 7,
    code: "gestacao",
    text: "Você já gestou ou pretende gestar nos próximos 12 meses? Já fez algum tratamento nesse sentido?",
    category: "Saúde feminina",
    summaryCategory: "Saúde feminina",
    fieldType: "long_text",
    required: true,
    allowNotApplicable: true,
    allowPreferNot: true,
  },
  {
    number: 8,
    code: "contraceptivos",
    text: "Você usa dispositivos intrauterinos DIU (cobre ou hormonal) ou contraceptivos hormonais (pílula, injeção, implante)? Há quanto tempo?",
    category: "Saúde feminina",
    summaryCategory: "Saúde feminina",
    fieldType: "choice",
    config: {
      options: ["Sim", "Não"],
      detailsLabel: "Se sim: qual método e há quanto tempo",
      detailsRequiredFor: ["Sim"],
    },
    required: true,
    allowNotApplicable: true,
    allowPreferNot: true,
  },
  {
    number: 9,
    code: "segurar_excrecoes",
    text: "Você tem hábito de segurar xixi, cocô e pum?",
    category: "Hábitos",
    summaryCategory: "Hábitos",
    fieldType: "long_text",
    required: true,
  },
  {
    number: 10,
    code: "segurar_impulsos",
    text: "Você tem hábito de segurar choro, bocejo, arroto, a fome, a sede ou o sono?",
    category: "Hábitos",
    summaryCategory: "Hábitos",
    fieldType: "long_text",
    required: true,
  },
  {
    number: 11,
    code: "rotina_manha",
    text: "Descreva sua rotina no período da manhã, entre às 6h e 12h (que horas você acorda, como é sua alimentação e quais atividades desempenha).",
    category: "Rotina",
    summaryCategory: "Rotina",
    fieldType: "long_text",
    required: true,
  },
  {
    number: 12,
    code: "rotina_tarde",
    text: "Descreva sua rotina no período da tarde, entre às 12h e 18h (que horas você almoça, como é sua alimentação, inclusive no período da tarde e quais atividades desempenha).",
    category: "Rotina",
    summaryCategory: "Rotina",
    fieldType: "long_text",
    required: true,
  },
  {
    number: 13,
    code: "rotina_noite",
    text: "Descreva sua rotina a partir das 18h até a hora de dormir (como é sua alimentação e quais atividades desempenha).",
    category: "Rotina",
    summaryCategory: "Rotina",
    fieldType: "long_text",
    required: true,
  },
  {
    number: 14,
    code: "sono",
    text: "Que horas você dorme? Tem sono reparador? Acorda durante à noite? Se sente disposta no dia seguinte?",
    category: "Sono e corpo",
    summaryCategory: "Sono e sistema excretor",
    fieldType: "long_text",
    required: true,
  },
  {
    number: 15,
    code: "sistema_excretor",
    text: "Como está seu sistema excretor - micção, evacuação e suor? Você urina em quantidade proporcional ao que ingere de líquido? Seu intestino funciona todos os dias satisfatoriamente? Se corpo produz suor quando pratica atividade física?",
    category: "Sono e corpo",
    summaryCategory: "Sono e sistema excretor",
    fieldType: "long_text",
    required: true,
  },
  {
    number: 16,
    code: "atividade_fisica",
    text: "Você pratica alguma atividade física/esporte? Quantas vezes por semana e em qual intensidade? Se sente bem e realizada com essa atividade?",
    category: "Sono e corpo",
    summaryCategory: "Atividade física",
    fieldType: "long_text",
    required: true,
  },
  {
    number: 17,
    code: "alimentos",
    text: "Quais alimentos você não gosta ou não tolera? (Aqui, me diga também se você é vegana ou vegetariana).",
    category: "Alimentação",
    summaryCategory: "Alimentação",
    fieldType: "long_text",
    required: true,
  },
  {
    number: 18,
    code: "abertura_vegetariana",
    text: "Você está aberta para uma alimentação vegetariana por um curto período de tempo - aproximadamente 15 dias?",
    category: "Alimentação",
    summaryCategory: "Abertura para tratamentos",
    fieldType: "choice",
    config: OPEN_OPTIONS,
    required: true,
  },
  {
    number: 19,
    code: "abertura_fitoterapicos",
    text: "Você está aberta para utilização de fitoterápicos ayurvédicos, caso seja necessário?",
    category: "Tratamento",
    summaryCategory: "Abertura para tratamentos",
    fieldType: "choice",
    config: OPEN_OPTIONS,
    required: true,
  },
  {
    number: 20,
    code: "abertura_rituais",
    text: "Você está aberta para utilização de rituais e mantras védicos durante o seu tratamento?",
    category: "Tratamento",
    summaryCategory: "Abertura para tratamentos",
    fieldType: "choice",
    config: OPEN_OPTIONS,
    required: true,
  },
];

export const CATEGORY_ORDER: Record<string, number> = Object.fromEntries(
  STEPS.map((s, i) => [s.title, i + 1]),
);
