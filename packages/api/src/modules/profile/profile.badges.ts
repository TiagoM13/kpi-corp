import { KpiCategory } from "@kpi-corp/db/prisma/generated/enums";

import {
	previousWindow,
	type RankableRow,
	type RankingWindow,
	rank,
	windowOf,
} from "../../shared/ranking";
import { dayOf, TIMEZONE } from "../../shared/time";

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
		description: "Pontuou em 4 semanas consecutivas.",
		icon: "🔥",
		rarity: "EPICA",
		available: true,
		target: 4,
	},
	{
		code: "TWELVE_WEEK_STREAK",
		name: "Inabalável",
		description: "Pontuou em 12 semanas consecutivas.",
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
		available: true,
		target: 10,
	},
	{
		code: "TOP_THREE",
		name: "Pódio",
		description: "Terminou entre os 3 primeiros do ranking geral.",
		icon: "🏅",
		rarity: "EPICA",
		available: true,
		target: null,
	},
	{
		code: "PERFECT_MONTH",
		name: "Pontual",
		description: "Esteve presente em todas as reuniões de um mês.",
		icon: "⏱️",
		rarity: "COMUM",
		available: true,
		target: null,
	},
	{
		code: "PODIUM_STREAK",
		name: "Lendário",
		description: "Terminou 3 meses consecutivos no top 3 do ranking.",
		icon: "👑",
		rarity: "LENDARIA",
		available: true,
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

export type BadgeContext = {
	userId: string;
	memberSince: Date | null;
	presences: Date[];
	team: RankableRow[];
	monthlyAssignments: { userId: string; points: number; assignedAt: Date }[];
	meetings: { date: Date; closedAt: Date | null; present: boolean }[];
};

export function emptyBadgeContext(userId = ""): BadgeContext {
	return {
		userId,
		memberSince: null,
		presences: [],
		team: [],
		monthlyAssignments: [],
		meetings: [],
	};
}

const PODIUM_SIZE = 3;

export const PODIUM_STREAK_MONTHS = 12;

export function podiumMonths(now: Date): RankingWindow[] {
	const months: RankingWindow[] = [];
	let cursor = previousWindow("month", windowOf("month", now));

	for (let index = 0; index < PODIUM_STREAK_MONTHS; index += 1) {
		months.unshift(cursor);
		cursor = previousWindow("month", cursor);
	}

	return months;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const SP_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
	timeZone: TIMEZONE,
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
		throw new Error(`Data inválida em ${TIMEZONE}: ${date.toISOString()}`);
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

function tenMeetings(presences: Date[]): RawBadgeEvaluation {
	const total = presences.length;

	return {
		code: "TEN_MEETINGS",
		earned: total >= 10,
		current: total,
		target: 10,
		earnedAt: total >= 10 ? (presences[9] ?? null) : null,
	};
}

function topThree(
	assignments: BadgeAssignment[],
	context: BadgeContext,
): RawBadgeEvaluation {
	const me = rank(context.team).find((row) => row.userId === context.userId);
	const last = assignments[assignments.length - 1];
	const earned =
		me !== undefined && me.position <= PODIUM_SIZE && me.points > 0 && !!last;

	return {
		code: "TOP_THREE",
		earned,
		current: earned ? 1 : 0,
		target: null,
		earnedAt: earned ? (last?.assignedAt ?? null) : null,
	};
}

// meeting.date é dia de calendário gravado como meia-noite UTC.
function meetingMonth(date: Date): string {
	return date.toISOString().slice(0, 7);
}

function perfectMonth(context: BadgeContext, now: Date): RawBadgeEvaluation {
	const currentMonth = dayOf(now).slice(0, 7);
	const byMonth = new Map<string, { present: boolean; closedAt: Date }[]>();

	for (const meeting of context.meetings) {
		const month = meetingMonth(meeting.date);

		if (
			meeting.closedAt === null ||
			month >= currentMonth ||
			context.memberSince === null ||
			meeting.date.getTime() <= context.memberSince.getTime()
		) {
			continue;
		}

		const bucket = byMonth.get(month) ?? [];
		bucket.push({ present: meeting.present, closedAt: meeting.closedAt });
		byMonth.set(month, bucket);
	}

	const perfect = [...byMonth.keys()]
		.sort()
		.map((month) => byMonth.get(month) ?? [])
		.find(
			(meetings) =>
				meetings.length > 0 && meetings.every((meeting) => meeting.present),
		);

	const earnedAt = perfect
		? new Date(
				Math.max(...perfect.map((meeting) => meeting.closedAt.getTime())),
			)
		: null;

	return {
		code: "PERFECT_MONTH",
		earned: perfect !== undefined,
		current: perfect ? 1 : 0,
		target: null,
		earnedAt,
	};
}

type PodiumMonth = {
	onPodium: boolean;
	lastAssignedAt: Date | null;
};

function podiumHistory(context: BadgeContext, now: Date): PodiumMonth[] {
	return podiumMonths(now).map((window) => {
		const inWindow = context.monthlyAssignments.filter(
			(assignment) =>
				assignment.assignedAt >= window.start &&
				assignment.assignedAt < window.end,
		);

		const rows = context.team.map((member) => {
			const own = inWindow.filter(
				(assignment) => assignment.userId === member.userId,
			);

			return {
				userId: member.userId,
				name: member.name,
				points: own.reduce((sum, assignment) => sum + assignment.points, 0),
				kpiCount: own.length,
			};
		});

		const me = rank(rows).find((row) => row.userId === context.userId);
		const mine = inWindow.filter(
			(assignment) => assignment.userId === context.userId,
		);
		const lastAssignedAt = mine.reduce<Date | null>(
			(latest, assignment) =>
				latest === null || assignment.assignedAt > latest
					? assignment.assignedAt
					: latest,
			null,
		);

		return {
			onPodium:
				inWindow.length > 0 &&
				me !== undefined &&
				me.position <= PODIUM_SIZE &&
				me.points > 0,
			lastAssignedAt,
		};
	});
}

function podiumStreak(context: BadgeContext, now: Date): RawBadgeEvaluation {
	const months = podiumHistory(context, now);
	const target = 3;

	let best = 0;
	let run = 0;
	let earnedAt: Date | null = null;

	for (const month of months) {
		run = month.onPodium ? run + 1 : 0;
		best = Math.max(best, run);

		if (run === target && earnedAt === null) {
			earnedAt = month.lastAssignedAt;
		}
	}

	return {
		code: "PODIUM_STREAK",
		earned: best >= target,
		current: best,
		target,
		earnedAt: best >= target ? earnedAt : null,
	};
}

export function evaluateBadges(
	assignments: BadgeAssignment[],
	now: Date,
	context: BadgeContext = emptyBadgeContext(),
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
			case "TEN_MEETINGS":
				return tenMeetings(context.presences);
			case "TOP_THREE":
				return topThree(assignments, context);
			case "PERFECT_MONTH":
				return perfectMonth(context, now);
			case "PODIUM_STREAK":
				return podiumStreak(context, now);
			default: {
				const unknown: never = entry;
				throw new Error(`Badge sem avaliador: ${JSON.stringify(unknown)}`);
			}
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
		// badge indisponivel. Hoje as dez estao disponiveis; a guarda fica para
		// a proxima badge declarada antes de ter regra.
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
