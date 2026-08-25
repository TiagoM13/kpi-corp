export const KPI_CATEGORY_IDS = [
	"presenca",
	"desempenho",
	"comportamento",
	"iniciativa",
] as const;

export type KpiCategoryId = (typeof KPI_CATEGORY_IDS)[number];

export type KpiCategory = {
	id: KpiCategoryId;
	label: string;
	color: string;
};

export const KPI_CATEGORIES: KpiCategory[] = [
	{ id: "presenca", label: "Presença", color: "var(--cat-presenca)" },
	{ id: "desempenho", label: "Desempenho", color: "var(--cat-desempenho)" },
	{
		id: "comportamento",
		label: "Comportamento",
		color: "var(--cat-comportamento)",
	},
	{ id: "iniciativa", label: "Iniciativa", color: "var(--cat-iniciativa)" },
];

export type Kpi = {
	id: string;
	name: string;
	category: KpiCategoryId;
	points: number;
	description: string;
	uses: number;
	active: boolean;
};

export const MOCK_KPIS: Kpi[] = [
	{
		id: "k1",
		name: "Presença na reunião",
		category: "presenca",
		points: 5,
		description: "Esteve presente na reunião semanal de squad.",
		uses: 142,
		active: true,
	},
	{
		id: "k2",
		name: "Chegou no horário",
		category: "presenca",
		points: 3,
		description: "Pontualidade conta — chegou antes do início.",
		uses: 88,
		active: true,
	},
	{
		id: "k3",
		name: "Boa ideia em reunião",
		category: "iniciativa",
		points: 15,
		description: "Trouxe uma ideia que mudou o rumo da discussão.",
		uses: 24,
		active: true,
	},
	{
		id: "k4",
		name: "Ajudou um colega",
		category: "comportamento",
		points: 10,
		description: "Reservou tempo para destravar alguém do time.",
		uses: 67,
		active: true,
	},
	{
		id: "k5",
		name: "Entregou no prazo",
		category: "desempenho",
		points: 12,
		description: "Cumpriu o combinado dentro da janela acordada.",
		uses: 51,
		active: true,
	},
	{
		id: "k6",
		name: "Mentoria",
		category: "comportamento",
		points: 20,
		description: "Conduziu uma sessão de mentoria com novato.",
		uses: 9,
		active: true,
	},
	{
		id: "k7",
		name: "Resolveu bug crítico",
		category: "desempenho",
		points: 25,
		description: "Atacou um incidente em produção e resolveu.",
		uses: 14,
		active: true,
	},
	{
		id: "k8",
		name: "Documentou processo",
		category: "iniciativa",
		points: 8,
		description: "Deixou registro escrito de algo que era folclore.",
		uses: 31,
		active: true,
	},
	{
		id: "k9",
		name: "Feedback construtivo",
		category: "comportamento",
		points: 7,
		description: "Deu retorno claro e útil em 1:1 ou code review.",
		uses: 42,
		active: true,
	},
	{
		id: "k10",
		name: "Ofuscou (legado)",
		category: "comportamento",
		points: 5,
		description: "KPI antigo, mantido por compatibilidade.",
		uses: 3,
		active: false,
	},
];

export const KPI_BY_ID = new Map(MOCK_KPIS.map((kpi) => [kpi.id, kpi]));

export const CATEGORY_BY_ID = new Map(
	KPI_CATEGORIES.map((category) => [category.id, category]),
);
