import { KpiCategory } from "@kpi-corp/db/prisma/generated/enums";

export const BADGE_TIMEZONE = "America/Sao_Paulo";

export const KPI_CATEGORIES = Object.values(KpiCategory);

export const ALL_CATEGORIES_TARGET = KPI_CATEGORIES.length;

export type BadgeCode =
	| "FIRST_POINT"
	| "FIVE_PERFORMANCE"
	| "ALL_CATEGORIES"
	| "TWENTY_FIVE_KPIS"
	| "FOUR_WEEK_STREAK"
	| "TWELVE_WEEK_STREAK"
	| "TEN_MEETINGS"
	| "TOP_THREE"
	| "PERFECT_MONTH"
	| "PODIUM_STREAK";

export type BadgeRarity = "COMUM" | "RARA" | "EPICA" | "LENDARIA";

/**
 * Atribuições válidas do membro, ordenadas por assignedAt crescente.
 * Pré-condição garantida pelo repository: revokedAt IS NULL e points > 0.
 */
export type BadgeAssignment = {
	points: number;
	assignedAt: Date;
	kpi: { category: string };
};

export type BadgeCatalogEntry = {
	code: BadgeCode;
	name: string;
	description: string;
	icon: string;
	rarity: BadgeRarity;
	available: boolean;
	target: number | null;
};

export const BADGE_CATALOG = [
	{
		code: "FIRST_POINT",
		name: "Primeira pontuação",
		description: "Recebeu a primeira atribuição válida de KPI.",
		icon: "🌱",
		rarity: "COMUM",
		available: true,
		target: 1,
	},
	{
		code: "FIVE_PERFORMANCE",
		name: "Alta performance",
		description: "Acumulou 5 atribuições válidas na categoria performance.",
		icon: "⚡",
		rarity: "RARA",
		available: true,
		target: 5,
	},
	{
		code: "ALL_CATEGORIES",
		name: "Completista",
		description: "Pontuou em todas as categorias de KPI.",
		icon: "🧭",
		rarity: "RARA",
		available: true,
		target: ALL_CATEGORIES_TARGET,
	},
	{
		code: "TWENTY_FIVE_KPIS",
		name: "Colecionador",
		description: "Acumulou 25 atribuições válidas de KPI.",
		icon: "📚",
		rarity: "RARA",
		available: true,
		target: 25,
	},
	{
		code: "FOUR_WEEK_STREAK",
		name: "Constante",
		description: "Pontuou em 4 semanas ISO consecutivas.",
		icon: "🔥",
		rarity: "EPICA",
		available: true,
		target: 4,
	},
	{
		code: "TWELVE_WEEK_STREAK",
		name: "Inabalável",
		description: "Pontuou em 12 semanas ISO consecutivas.",
		icon: "💎",
		rarity: "EPICA",
		available: true,
		target: 12,
	},
	{
		code: "TEN_MEETINGS",
		name: "Presente",
		description: "Participou de 10 reuniões com presença registrada.",
		icon: "🤝",
		rarity: "RARA",
		available: false,
		target: 10,
	},
	{
		code: "TOP_THREE",
		name: "Pódio",
		description: "Terminou entre os 3 primeiros do ranking geral.",
		icon: "🏅",
		rarity: "EPICA",
		available: false,
		target: null,
	},
	{
		code: "PERFECT_MONTH",
		name: "Pontual",
		description: "Esteve presente em todas as reuniões de um mês.",
		icon: "⏱️",
		rarity: "COMUM",
		available: false,
		target: null,
	},
	{
		code: "PODIUM_STREAK",
		name: "Lendário",
		description: "Terminou 3 meses consecutivos no top 3 do ranking.",
		icon: "👑",
		rarity: "LENDARIA",
		available: false,
		target: 3,
	},
] as const satisfies readonly BadgeCatalogEntry[];

export type RawBadgeEvaluation = {
	code: BadgeCode;
	earned: boolean;
	current: number;
	target: number | null;
	earnedAt: Date | null;
};

export type BadgeContractEntry = {
	code: BadgeCode;
	name: string;
	description: string;
	icon: string;
	rarity: BadgeRarity;
	available: boolean;
	earned: boolean;
	earnedAt: Date | null;
	current: number;
	target: number | null;
	progress: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const SP_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
	timeZone: BADGE_TIMEZONE,
	year: "numeric",
	month: "numeric",
	day: "numeric",
});

/**
 * Segunda-feira da semana ISO da data, em ms UTC.
 *
 * Converte o instante para a data civil em America/Sao_Paulo e calcula a
 * segunda-feira daquela semana ISO a partir da data civil — sem nunca usar a
 * string "YYYY-Www", que quebra na virada de ano (semana 52 → semana 1).
 * Duas semanas são consecutivas quando as segundas-feiras distam 7 dias exatos.
 */
function mondayOfIsoWeek(date: Date): number {
	const parts: { year?: number; month?: number; day?: number } = {};

	for (const part of SP_DATE_FORMATTER.formatToParts(date)) {
		if (part.type !== "literal") {
			parts[part.type as "year" | "month" | "day"] = Number(part.value);
		}
	}

	if (
		parts.year === undefined ||
		parts.month === undefined ||
		parts.day === undefined
	) {
		throw new Error(
			`Data inválida em ${BADGE_TIMEZONE}: ${date.toISOString()}`,
		);
	}

	const civil = Date.UTC(parts.year, parts.month - 1, parts.day);
	const isoDay = new Date(civil).getUTCDay() || 7;

	return civil - (isoDay - 1) * DAY_MS;
}

type WeekEntry = {
	monday: number;
	first: BadgeAssignment;
};

type StreakStats = {
	weeks: WeekEntry[];
	best: number;
	bestRunStart: number;
	current: number;
};

/**
 * Uma entrada por semana ISO com atribuição, com a primeira atribuição
 * da semana. As atribuições chegam ordenadas por assignedAt crescente.
 */
function weeksOf(assignments: BadgeAssignment[]): WeekEntry[] {
	const weeks: WeekEntry[] = [];

	for (const assignment of assignments) {
		const monday = mondayOfIsoWeek(assignment.assignedAt);
		const last = weeks[weeks.length - 1];

		if (last && last.monday === monday) {
			continue;
		}

		weeks.push({ monday, first: assignment });
	}

	return weeks;
}

/**
 * Melhor sequência decide earned/earnedAt e nunca regride; a sequência atual
 * regride quando fura e tolera a semana corrente ainda em curso.
 */
function streakStats(assignments: BadgeAssignment[], now: Date): StreakStats {
	const weeks = weeksOf(assignments);

	let best = 0;
	let bestRunStart = 0;
	let current = 0;

	let runStart = 0;
	for (let index = 0; index < weeks.length; index++) {
		const week = weeks[index];
		const next = weeks[index + 1];
		if (!week) {
			continue;
		}

		const isRunEnd = !next || next.monday - week.monday !== WEEK_MS;

		if (!isRunEnd) {
			continue;
		}

		const length = index - runStart + 1;
		if (length > best) {
			best = length;
			bestRunStart = runStart;
		}

		if (index === weeks.length - 1) {
			const nowMonday = mondayOfIsoWeek(now);

			if (week.monday === nowMonday || week.monday === nowMonday - WEEK_MS) {
				current = length;
			}
		}

		runStart = index + 1;
	}

	return { weeks, best, bestRunStart, current };
}

function firstPoint(assignments: BadgeAssignment[]): RawBadgeEvaluation {
	const total = assignments.length;

	return {
		code: "FIRST_POINT",
		earned: total >= 1,
		current: Math.min(total, 1),
		target: 1,
		earnedAt: total >= 1 ? (assignments[0]?.assignedAt ?? null) : null,
	};
}

function fivePerformance(assignments: BadgeAssignment[]): RawBadgeEvaluation {
	const performance = assignments.filter(
		(assignment) => assignment.kpi.category === "PERFORMANCE",
	);

	return {
		code: "FIVE_PERFORMANCE",
		earned: performance.length >= 5,
		current: performance.length,
		target: 5,
		earnedAt:
			performance.length >= 5 ? (performance[4]?.assignedAt ?? null) : null,
	};
}

function allCategories(
	assignments: BadgeAssignment[],
	target: number,
): RawBadgeEvaluation {
	const seen = new Set<string>();
	let closing: BadgeAssignment | null = null;

	for (const assignment of assignments) {
		if (!seen.has(assignment.kpi.category)) {
			seen.add(assignment.kpi.category);
			closing = assignment;
		}
	}

	const current = seen.size;

	return {
		code: "ALL_CATEGORIES",
		earned: current >= target,
		current,
		target,
		earnedAt: current >= target ? (closing?.assignedAt ?? null) : null,
	};
}

function twentyFiveKpis(assignments: BadgeAssignment[]): RawBadgeEvaluation {
	const total = assignments.length;

	return {
		code: "TWENTY_FIVE_KPIS",
		earned: total >= 25,
		current: total,
		target: 25,
		earnedAt: total >= 25 ? (assignments[24]?.assignedAt ?? null) : null,
	};
}

function weekStreak(
	assignments: BadgeAssignment[],
	now: Date,
	target: number,
	code: "FOUR_WEEK_STREAK" | "TWELVE_WEEK_STREAK",
): RawBadgeEvaluation {
	const { weeks, best, bestRunStart, current } = streakStats(assignments, now);
	const earned = best >= target;

	return {
		code,
		earned,
		current,
		target,
		earnedAt: earned
			? (weeks[bestRunStart + target - 1]?.first.assignedAt ?? null)
			: null,
	};
}

function unavailableBadge(
	code: BadgeCode,
	target: number | null,
): RawBadgeEvaluation {
	return { code, earned: false, current: 0, target, earnedAt: null };
}

export function evaluateBadges(
	assignments: BadgeAssignment[],
	now: Date,
): RawBadgeEvaluation[] {
	return BADGE_CATALOG.map((entry) => {
		switch (entry.code) {
			case "FIRST_POINT":
				return firstPoint(assignments);
			case "FIVE_PERFORMANCE":
				return fivePerformance(assignments);
			case "ALL_CATEGORIES":
				return allCategories(assignments, entry.target);
			case "TWENTY_FIVE_KPIS":
				return twentyFiveKpis(assignments);
			case "FOUR_WEEK_STREAK":
			case "TWELVE_WEEK_STREAK":
				return weekStreak(assignments, now, entry.target, entry.code);
			default:
				return unavailableBadge(entry.code, entry.target);
		}
	});
}

export function buildBadgeResponse(
	evaluations: RawBadgeEvaluation[],
	earnedRows: { code: string; earnedAt: Date }[],
): BadgeContractEntry[] {
	const earnedAtByCode = new Map(
		earnedRows.map((row) => [row.code, row.earnedAt]),
	);

	return BADGE_CATALOG.map((entry) => {
		const evaluation = evaluations.find(
			(candidate) => candidate.code === entry.code,
		);
		if (!evaluation) {
			throw new Error(`Badge ${entry.code} sem avaliação`);
		}

		// Uma linha legada ou inserida fora deste fluxo nao pode desbloquear uma
		// badge que a Fase 3 ainda nao implementou. Quando a badge ficar
		// disponivel, o carimbo volta a participar normalmente da regra grudenta.
		const persistedAt = entry.available
			? earnedAtByCode.get(entry.code)
			: undefined;
		const earned =
			entry.available && (evaluation.earned || persistedAt !== undefined);
		const earnedAt = earned ? (persistedAt ?? evaluation.earnedAt) : null;
		const progress = earned
			? 100
			: evaluation.target === null
				? 0
				: Math.min(
						100,
						Math.floor((evaluation.current / evaluation.target) * 100),
					);

		return {
			code: entry.code,
			name: entry.name,
			description: entry.description,
			icon: entry.icon,
			rarity: entry.rarity,
			available: entry.available,
			earned,
			earnedAt,
			current: evaluation.current,
			target: evaluation.target,
			progress,
		};
	});
}
