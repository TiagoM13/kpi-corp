import { describe, expect, it } from "vitest";

import { rankOf } from "@/lib/member-stats";
import {
	formatPeriodWindow,
	MEMBER_RANKING_PERIODS,
	overallPositionOf,
	PERIOD_SLUGS,
	periodFromSlug,
	RANKING_PERIODS,
	type RankingPeriod,
	rankingFor,
	TEAM_SIZE,
} from "@/lib/ranking";
import { MOCK_MEMBERS } from "@/mocks/members";

type MockPeriod = Exclude<RankingPeriod, "quarter">;

const PERIODS: MockPeriod[] = ["week", "month", "all"];

function names(period: MockPeriod, count: number) {
	return rankingFor(period)
		.slice(0, count)
		.map((entry) => entry.member.name);
}

describe("rankingFor", () => {
	it.each(PERIODS)("classifica o time inteiro no periodo %s", (period) => {
		const entries = rankingFor(period);

		expect(entries).toHaveLength(MOCK_MEMBERS.length);
		expect(entries.map((entry) => entry.place)).toStrictEqual(
			entries.map((_, index) => index + 1),
		);
	});

	it.each(PERIODS)("ordena do maior para o menor em %s", (period) => {
		const points = rankingFor(period).map((entry) => entry.points);

		expect(points).toStrictEqual([...points].sort((a, b) => b - a));
	});

	it("usa os pontos totais no geral", () => {
		expect(names("all", 3)).toStrictEqual([
			"Ana Beatriz Souza",
			"Bruno Carvalho",
			"Carla Menezes",
		]);
	});

	it("soma a tendencia de 7 dias na semana", () => {
		const [first] = rankingFor("week");

		expect(first?.member.name).toBe("Carla Menezes");
		expect(first?.points).toBe(158);
	});

	it("usa monthPoints no mes", () => {
		const [first] = rankingFor("month");

		expect(first?.member.name).toBe("Carla Menezes");
		expect(first?.points).toBe(520);
	});

	it("o podio muda conforme o periodo", () => {
		expect(names("week", 3)).not.toStrictEqual(names("all", 3));
	});

	it("devolve sempre a mesma referencia — nao recalcula por chamada", () => {
		expect(rankingFor("all")).toBe(rankingFor("all"));
	});

	it("carrega a mudanca de posicao do membro", () => {
		const lucas = rankingFor("all").find((entry) => entry.member.id === "u12");

		expect(lucas?.change).toBe(4);
	});
});

describe("periodFromSlug", () => {
	it.each(RANKING_PERIODS)("aceita o slug de %s", (period) => {
		expect(periodFromSlug(PERIOD_SLUGS[period])).toBe(period);
	});

	it.each([["desconhecido"], [""], [null], [undefined], [42]])(
		"cai em geral para entrada invalida %j",
		(slug) => {
			expect(periodFromSlug(slug)).toBe("all");
		},
	);

	it("so aceita trimestre quando o periodo esta liberado", () => {
		expect(periodFromSlug("trimestre")).toBe("quarter");
		expect(periodFromSlug("trimestre", MEMBER_RANKING_PERIODS)).toBe("all");
	});
});

describe("formatPeriodWindow", () => {
	const base = { period: "month" as const, items: [], me: null };

	it("mostra o intervalo do periodo em pt-BR", () => {
		expect(
			formatPeriodWindow({
				...base,
				periodStart: "2026-09-01",
				periodEnd: "2026-09-30",
			}),
		).toBe("1 de set. a 30 de set.");
	});

	it("nao mostra intervalo no geral", () => {
		expect(
			formatPeriodWindow({
				...base,
				period: "all",
				periodStart: null,
				periodEnd: null,
			}),
		).toBeNull();
	});
});

describe("overallPositionOf", () => {
	it("bate com a ordem do ranking geral", () => {
		for (const entry of rankingFor("all")) {
			expect(overallPositionOf(entry.member.id)).toBe(entry.place);
		}
	});

	it("member-stats.rankOf delega para a mesma fonte", () => {
		expect(rankOf("u1")).toBe(overallPositionOf("u1"));
		expect(rankOf("u12")).toBe(overallPositionOf("u12"));
		expect(rankOf("nao-existe")).toBe(TEAM_SIZE);
	});
});
