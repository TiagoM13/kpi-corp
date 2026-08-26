export type TeamPeriod = "7d" | "30d" | "90d" | "all";

export const TEAM_PERIODS: TeamPeriod[] = ["7d", "30d", "90d", "all"];

export type TeamSeries = {
	shortLabel: string;
	title: string;
	points: number[];
	ticks: string[];
};

export const TEAM_HISTORY: Record<TeamPeriod, TeamSeries> = {
	"7d": {
		shortLabel: "7d",
		title: "Últimos 7 dias",
		points: [96, 132, 88, 154, 121, 168, 143],
		ticks: ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"],
	},
	"30d": {
		shortLabel: "30d",
		title: "Últimos 30 dias",
		points: [268, 341, 295, 402, 358, 447, 419, 486, 452, 531],
		ticks: [
			"5 abr",
			"8 abr",
			"11 abr",
			"14 abr",
			"17 abr",
			"20 abr",
			"23 abr",
			"26 abr",
			"29 abr",
			"3 mai",
		],
	},
	"90d": {
		shortLabel: "90d",
		title: "Últimas 12 semanas",
		points: [
			820, 910, 760, 1020, 980, 1140, 1210, 1180, 1390, 1420, 1310, 1480,
		],
		ticks: [
			"9 fev",
			"16 fev",
			"23 fev",
			"1 mar",
			"9 mar",
			"16 mar",
			"23 mar",
			"30 mar",
			"6 abr",
			"13 abr",
			"20 abr",
			"4 mai",
		],
	},
	all: {
		shortLabel: "Tudo",
		title: "Desde o início",
		points: [
			1180, 1640, 2210, 2680, 3120, 3890, 4310, 5020, 5680, 6340, 7150, 7920,
		],
		ticks: [
			"jun",
			"jul",
			"ago",
			"set",
			"out",
			"nov",
			"dez",
			"jan",
			"fev",
			"mar",
			"abr",
			"mai",
		],
	},
};

export const TEAM_STATS = {
	weekKpis: 47,
	weekMeetings: 14,
	pointsDelta: 12,
	kpisDelta: 28,
	membersDelta: 0,
};
