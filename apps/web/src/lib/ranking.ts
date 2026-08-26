import { type Member, MOCK_MEMBERS } from "@/mocks/members";

export type RankingPeriod = "week" | "month" | "all";

export const RANKING_PERIODS: RankingPeriod[] = ["week", "month", "all"];

export const PERIOD_SLUGS: Record<RankingPeriod, string> = {
	week: "semana",
	month: "mes",
	all: "geral",
};

const PERIOD_BY_SLUG = new Map(
	RANKING_PERIODS.map((period) => [PERIOD_SLUGS[period], period]),
);

export function periodFromSlug(slug: unknown): RankingPeriod {
	if (typeof slug !== "string") return "all";
	return PERIOD_BY_SLUG.get(slug) ?? "all";
}

export type RankingEntry = {
	member: Member;
	place: number;
	points: number;
	change: number;
};

function pointsFor(member: Member, period: RankingPeriod) {
	if (period === "week") {
		return member.trend.reduce((total, value) => total + value, 0);
	}

	if (period === "month") return member.monthPoints;

	return member.points;
}

function buildRanking(period: RankingPeriod): RankingEntry[] {
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

const RANKINGS = new Map<RankingPeriod, RankingEntry[]>(
	RANKING_PERIODS.map((period) => [period, buildRanking(period)]),
);

const NO_RANKING: RankingEntry[] = [];

export function rankingFor(period: RankingPeriod) {
	return RANKINGS.get(period) ?? NO_RANKING;
}

export const TEAM_SIZE = MOCK_MEMBERS.length;

const OVERALL_POSITION = new Map(
	rankingFor("all").map((entry) => [entry.member.id, entry.place]),
);

export function overallPositionOf(memberId: string) {
	return OVERALL_POSITION.get(memberId) ?? TEAM_SIZE;
}
