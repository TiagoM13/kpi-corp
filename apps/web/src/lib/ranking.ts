import type { AppRouterClient } from "@kpi-corp/api/routers/index";

import { type Member, MOCK_MEMBERS } from "@/mocks/members";

export type TeamRanking = Awaited<
	ReturnType<AppRouterClient["ranking"]["get"]>
>;
export type TeamRankingEntry = TeamRanking["items"][number];
export type RankingPeriod = TeamRanking["period"];

export const RANKING_PERIODS: RankingPeriod[] = [
	"week",
	"month",
	"quarter",
	"all",
];

export const MEMBER_RANKING_PERIODS: RankingPeriod[] = ["week", "month", "all"];

export const PERIOD_SLUGS: Record<RankingPeriod, string> = {
	week: "semana",
	month: "mes",
	quarter: "trimestre",
	all: "geral",
};

export const PERIOD_LABELS: Record<RankingPeriod, string> = {
	week: "Semana",
	month: "Mês",
	quarter: "Trimestre",
	all: "Geral",
};

const PERIOD_BY_SLUG = new Map(
	RANKING_PERIODS.map((period) => [PERIOD_SLUGS[period], period]),
);

export function periodFromSlug(
	slug: unknown,
	allowed: RankingPeriod[] = RANKING_PERIODS,
): RankingPeriod {
	const period = typeof slug === "string" ? PERIOD_BY_SLUG.get(slug) : null;
	return period && allowed.includes(period) ? period : "all";
}

const windowDayFormat = new Intl.DateTimeFormat("pt-BR", {
	day: "numeric",
	month: "short",
});

function dayOf(isoDay: string) {
	return new Date(`${isoDay}T12:00:00`);
}

export function formatPeriodWindow(ranking: TeamRanking) {
	if (!ranking.periodStart || !ranking.periodEnd) return null;

	return `${windowDayFormat.format(dayOf(ranking.periodStart))} a ${windowDayFormat.format(dayOf(ranking.periodEnd))}`;
}

type MockRankingPeriod = Exclude<RankingPeriod, "quarter">;

const MOCK_RANKING_PERIODS: MockRankingPeriod[] = ["week", "month", "all"];

export type RankingEntry = {
	member: Member;
	place: number;
	points: number;
	change: number;
};

function pointsFor(member: Member, period: MockRankingPeriod) {
	if (period === "week") {
		return member.trend.reduce((total, value) => total + value, 0);
	}

	if (period === "month") return member.monthPoints;

	return member.points;
}

function buildRanking(period: MockRankingPeriod): RankingEntry[] {
	return MOCK_MEMBERS.map((member) => ({
		member,
		points: pointsFor(member, period),
		change: member.rankChange,
		place: 0,
	}))
		.sort(
			(a, b) =>
				b.points - a.points ||
				a.member.name.localeCompare(b.member.name, "pt-BR"),
		)
		.map((entry, index) => ({ ...entry, place: index + 1 }));
}

const RANKINGS = new Map<MockRankingPeriod, RankingEntry[]>(
	MOCK_RANKING_PERIODS.map((period) => [period, buildRanking(period)]),
);

const NO_RANKING: RankingEntry[] = [];

export function rankingFor(period: MockRankingPeriod) {
	return RANKINGS.get(period) ?? NO_RANKING;
}

export const TEAM_SIZE = MOCK_MEMBERS.length;

const OVERALL_POSITION = new Map(
	rankingFor("all").map((entry) => [entry.member.id, entry.place]),
);

export function overallPositionOf(memberId: string) {
	return OVERALL_POSITION.get(memberId) ?? TEAM_SIZE;
}
