export type AchievementRarity = "comum" | "rara" | "épica" | "lendária";

export type Achievement = {
	id: string;
	name: string;
	description: string;
	rarity: AchievementRarity;
	icon: string;
	earnedBy: string[];
};

export const MOCK_ACHIEVEMENTS: Achievement[] = [
	{
		id: "b1",
		name: "Primeira pontuação",
		description: "Conquistou seu primeiro KPI.",
		rarity: "comum",
		icon: "🌱",
		earnedBy: [
			"u1",
			"u2",
			"u3",
			"u4",
			"u5",
			"u6",
			"u7",
			"u8",
			"u9",
			"u10",
			"u11",
			"u12",
		],
	},
	{
		id: "b2",
		name: "Sequência de 7",
		description: "7 dias consecutivos com KPI.",
		rarity: "comum",
		icon: "🔥",
		earnedBy: ["u1", "u2", "u3", "u5", "u7"],
	},
	{
		id: "b3",
		name: "Sequência de 14",
		description: "Duas semanas seguidas pontuando.",
		rarity: "rara",
		icon: "⚡",
		earnedBy: ["u1", "u3"],
	},
	{
		id: "b4",
		name: "Mil pontos",
		description: "Atingiu 1.000 pontos acumulados.",
		rarity: "rara",
		icon: "🏔️",
		earnedBy: ["u1", "u2", "u3", "u4", "u5", "u6"],
	},
	{
		id: "b5",
		name: "Mentor",
		description: "Conduziu 3 mentorias.",
		rarity: "épica",
		icon: "🦉",
		earnedBy: ["u1", "u3"],
	},
	{
		id: "b6",
		name: "Caçador de bugs",
		description: "Resolveu 5 bugs críticos.",
		rarity: "épica",
		icon: "🐛",
		earnedBy: ["u2"],
	},
	{
		id: "b7",
		name: "Pódio do mês",
		description: "Ficou no top 3 num mês.",
		rarity: "rara",
		icon: "🏆",
		earnedBy: ["u1", "u2", "u3"],
	},
	{
		id: "b8",
		name: "Lendário",
		description: "Pódio em 3 meses consecutivos.",
		rarity: "lendária",
		icon: "👑",
		earnedBy: ["u1"],
	},
	{
		id: "b9",
		name: "Pontual",
		description: "10 presenças no horário.",
		rarity: "comum",
		icon: "⏱️",
		earnedBy: ["u1", "u2", "u4", "u5"],
	},
	{
		id: "b10",
		name: "Voz da reunião",
		description: "5 boas ideias reconhecidas.",
		rarity: "épica",
		icon: "💡",
		earnedBy: ["u3", "u5"],
	},
];
