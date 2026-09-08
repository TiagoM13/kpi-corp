import { describe, expect, it } from "vitest";

import {
	ALL_CATEGORIES_TARGET,
	BADGE_CATALOG,
	type BadgeAssignment,
	type BadgeCode,
	buildBadgeResponse,
	evaluateBadges,
	KPI_CATEGORIES,
	type RawBadgeEvaluation,
} from "../../../modules/profile/profile.badges";

// Meio-dia UTC = 09h em America/Sao_Paulo (sem horário de verão desde 2019),
// então a data civil de SP é sempre a mesma do instante usado no nome.
const NOW = new Date("2026-03-16T12:00:00.000Z");

function assign(
	isoDate: string,
	category = "PRESENCE",
	points = 5,
): BadgeAssignment {
	return {
		points,
		assignedAt: new Date(isoDate),
		kpi: { category },
	};
}

function weeksFrom(baseIsoDate: string, count: number): BadgeAssignment[] {
	const base = Date.parse(baseIsoDate);

	return Array.from({ length: count }, (_, index) =>
		assign(new Date(base + index * 7 * 24 * 60 * 60 * 1000).toISOString()),
	);
}

function byCode(
	evaluations: RawBadgeEvaluation[],
	code: BadgeCode,
): RawBadgeEvaluation {
	const evaluation = evaluations.find((candidate) => candidate.code === code);

	expect(evaluation, `avaliação de ${code}`).toBeDefined();

	return evaluation as RawBadgeEvaluation;
}

describe("evaluateBadges", () => {
	it("returns one evaluation per catalog entry, in catalog order", () => {
		const evaluations = evaluateBadges([], NOW);

		expect(evaluations.map((evaluation) => evaluation.code)).toEqual(
			BADGE_CATALOG.map((entry) => entry.code),
		);
	});

	describe("FIRST_POINT", () => {
		it("is not earned without assignments", () => {
			const evaluation = byCode(evaluateBadges([], NOW), "FIRST_POINT");

			expect(evaluation).toMatchObject({
				earned: false,
				current: 0,
				target: 1,
				earnedAt: null,
			});
		});

		it("is earned by the first assignment and caps current at 1", () => {
			const first = assign("2026-03-02T12:00:00.000Z");
			const evaluation = byCode(
				evaluateBadges([first, assign("2026-03-03T12:00:00.000Z")], NOW),
				"FIRST_POINT",
			);

			expect(evaluation.earned).toBe(true);
			expect(evaluation.current).toBe(1);
			expect(evaluation.earnedAt).toEqual(first.assignedAt);
		});
	});

	describe("FIVE_PERFORMANCE", () => {
		it("counts only PERFORMANCE assignments", () => {
			const performance = weeksFrom("2026-01-05T12:00:00.000Z", 4).map(
				(assignment) =>
					assign(assignment.assignedAt.toISOString(), "PERFORMANCE", 10),
			);
			const mixed = [
				...performance,
				assign("2026-02-02T12:00:00.000Z", "BEHAVIOR"),
				assign("2026-02-03T12:00:00.000Z", "PERFORMANCE", 10),
			];

			const evaluation = byCode(evaluateBadges(mixed, NOW), "FIVE_PERFORMANCE");

			expect(evaluation.earned).toBe(true);
			expect(evaluation.current).toBe(5);
			expect(evaluation.earnedAt).toEqual(new Date("2026-02-03T12:00:00.000Z"));
		});

		it("is not earned with four PERFORMANCE assignments", () => {
			const assignments = weeksFrom("2026-01-05T12:00:00.000Z", 4).map(
				(assignment) =>
					assign(assignment.assignedAt.toISOString(), "PERFORMANCE"),
			);

			const evaluation = byCode(
				evaluateBadges(assignments, NOW),
				"FIVE_PERFORMANCE",
			);

			expect(evaluation.earned).toBe(false);
			expect(evaluation.current).toBe(4);
			expect(evaluation.earnedAt).toBeNull();
		});
	});

	describe("ALL_CATEGORIES", () => {
		it("counts distinct categories, not total assignments", () => {
			const assignments = [
				assign("2026-03-02T12:00:00.000Z", "PRESENCE"),
				assign("2026-03-03T12:00:00.000Z", "PERFORMANCE"),
				assign("2026-03-04T12:00:00.000Z", "BEHAVIOR"),
				assign("2026-03-05T12:00:00.000Z", "PRESENCE"),
				assign("2026-03-06T12:00:00.000Z", "PERFORMANCE"),
			];

			const evaluation = byCode(
				evaluateBadges(assignments, NOW),
				"ALL_CATEGORIES",
			);

			expect(evaluation.current).toBe(3);
			expect(evaluation.earned).toBe(false);
		});

		it("derives the target from the category list, not a hardcoded 4", () => {
			expect(ALL_CATEGORIES_TARGET).toBe(KPI_CATEGORIES.length);
			expect(ALL_CATEGORIES_TARGET).toBe(4);

			const evaluation = byCode(evaluateBadges([], NOW), "ALL_CATEGORIES");

			expect(evaluation.target).toBe(ALL_CATEGORIES_TARGET);
		});

		it("is earned when the last distinct category appears", () => {
			const assignments = [
				assign("2026-03-02T12:00:00.000Z", "PRESENCE"),
				assign("2026-03-03T12:00:00.000Z", "PERFORMANCE"),
				assign("2026-03-04T12:00:00.000Z", "BEHAVIOR"),
				assign("2026-03-10T12:00:00.000Z", "INITIATIVE"),
			];

			const evaluation = byCode(
				evaluateBadges(assignments, NOW),
				"ALL_CATEGORIES",
			);

			expect(evaluation.earned).toBe(true);
			expect(evaluation.current).toBe(4);
			expect(evaluation.earnedAt).toEqual(new Date("2026-03-10T12:00:00.000Z"));
		});
	});

	describe("TWENTY_FIVE_KPIS", () => {
		it("is earned by the 25th valid assignment", () => {
			const base = Date.parse("2026-01-05T12:00:00.000Z");
			const assignments = Array.from({ length: 25 }, (_, index) =>
				assign(new Date(base + index * 24 * 60 * 60 * 1000).toISOString()),
			);

			const evaluation = byCode(
				evaluateBadges(assignments, NOW),
				"TWENTY_FIVE_KPIS",
			);

			expect(evaluation.earned).toBe(true);
			expect(evaluation.current).toBe(25);
			expect(evaluation.earnedAt).toEqual(assignments[24]?.assignedAt);
		});
	});

	describe("week streaks", () => {
		it("zeroes the current streak on a one-week gap, keeping the best", () => {
			// Semanas de 2026-01-05 (segunda): semanas 1, 2 e 4 — furo na 3.
			const assignments = [
				assign("2026-01-05T12:00:00.000Z"),
				assign("2026-01-12T12:00:00.000Z"),
				assign("2026-01-26T12:00:00.000Z"),
			];
			const now = new Date("2026-02-02T12:00:00.000Z");

			const evaluation = byCode(
				evaluateBadges(assignments, now),
				"FOUR_WEEK_STREAK",
			);

			expect(evaluation.current).toBe(1);
			expect(evaluation.earned).toBe(false);
		});

		it("crosses the ISO year boundary (week 52 → week 1)", () => {
			// 2025-12-22 é segunda da semana ISO 52 de 2025; as três seguintes
			// caem nas semanas 1, 2 e 3 de 2026.
			const assignments = [
				assign("2025-12-22T12:00:00.000Z"),
				assign("2025-12-29T12:00:00.000Z"),
				assign("2026-01-05T12:00:00.000Z"),
				assign("2026-01-12T12:00:00.000Z"),
			];
			const now = new Date("2026-01-13T12:00:00.000Z");

			const four = byCode(evaluateBadges(assignments, now), "FOUR_WEEK_STREAK");
			const twelve = byCode(
				evaluateBadges(assignments, now),
				"TWELVE_WEEK_STREAK",
			);

			expect(four.earned).toBe(true);
			expect(four.current).toBe(4);
			expect(four.earnedAt).toEqual(new Date("2026-01-12T12:00:00.000Z"));
			expect(twelve.earned).toBe(false);
			expect(twelve.current).toBe(4);
		});

		it("keeps the best streak after the streak breaks", () => {
			// Semanas 1, 2 e 3, furo na 4, semanas 5 e 6 — melhor = 3, atual = 2.
			const assignments = [
				...weeksFrom("2026-01-05T12:00:00.000Z", 3),
				assign("2026-02-02T12:00:00.000Z"),
				assign("2026-02-09T12:00:00.000Z"),
			];
			const now = new Date("2026-02-10T12:00:00.000Z");

			const evaluation = byCode(
				evaluateBadges(assignments, now),
				"TWELVE_WEEK_STREAK",
			);

			expect(evaluation.earned).toBe(false);
			expect(evaluation.current).toBe(2);
		});

		it("stamps the earnedAt with the closing week, not now", () => {
			const assignments = weeksFrom("2025-12-22T12:00:00.000Z", 4);
			const farFuture = new Date("2031-01-01T12:00:00.000Z");

			const evaluation = byCode(
				evaluateBadges(assignments, farFuture),
				"FOUR_WEEK_STREAK",
			);

			expect(evaluation.earned).toBe(true);
			expect(evaluation.current).toBe(0);
			expect(evaluation.earnedAt).toEqual(new Date("2026-01-12T12:00:00.000Z"));
		});

		it("still counts the current streak while the current week has no KPI", () => {
			const assignments = weeksFrom("2026-03-02T12:00:00.000Z", 3);
			const now = new Date("2026-03-19T12:00:00.000Z");

			const evaluation = byCode(
				evaluateBadges(assignments, now),
				"FOUR_WEEK_STREAK",
			);

			expect(evaluation.current).toBe(3);
			expect(evaluation.earned).toBe(false);
		});

		it("zeroes the current streak when the last KPI is older than the previous week", () => {
			const assignments = weeksFrom("2026-01-05T12:00:00.000Z", 4);
			const now = new Date("2026-02-09T12:00:00.000Z");

			const evaluation = byCode(
				evaluateBadges(assignments, now),
				"FOUR_WEEK_STREAK",
			);

			expect(evaluation.earned).toBe(true);
			expect(evaluation.current).toBe(0);
		});

		it("earns a long past streak even with nothing recent", () => {
			const assignments = weeksFrom("2025-06-01T12:00:00.000Z", 12);
			const now = new Date("2026-03-16T12:00:00.000Z");

			const evaluation = byCode(
				evaluateBadges(assignments, now),
				"TWELVE_WEEK_STREAK",
			);

			expect(evaluation.earned).toBe(true);
			expect(evaluation.current).toBe(0);
			expect(evaluation.earnedAt).toEqual(new Date("2025-08-17T12:00:00.000Z"));
		});
	});

	describe("Fase 3 stubs", () => {
		it.each([
			["TEN_MEETINGS", 10],
			["TOP_THREE", null],
			["PERFECT_MONTH", null],
			["PODIUM_STREAK", 3],
		] as const)("never earns %s", (code, target) => {
			const assignments = weeksFrom("2025-12-22T12:00:00.000Z", 12);
			const evaluation = byCode(evaluateBadges(assignments, NOW), code);

			expect(evaluation).toMatchObject({
				earned: false,
				current: 0,
				target,
				earnedAt: null,
			});
		});

		it("marks the Fase 3 catalog entries as unavailable", () => {
			const unavailable = BADGE_CATALOG.filter((entry) => !entry.available);

			expect(unavailable.map((entry) => entry.code)).toEqual([
				"TEN_MEETINGS",
				"TOP_THREE",
				"PERFECT_MONTH",
				"PODIUM_STREAK",
			]);
		});
	});
});

describe("buildBadgeResponse", () => {
	const noEvaluations = evaluateBadges([], NOW);

	it("returns the ten catalog entries in order", () => {
		const response = buildBadgeResponse(noEvaluations, []);

		expect(response).toHaveLength(10);
		expect(response.map((entry) => entry.code)).toEqual(
			BADGE_CATALOG.map((entry) => entry.code),
		);
	});

	it("keeps earned sticky from a persisted row, with live current", () => {
		const earnedAt = new Date("2026-03-02T12:00:00.000Z");
		const response = buildBadgeResponse(noEvaluations, [
			{ code: "FIVE_PERFORMANCE", earnedAt },
		]);

		const badge = response.find((entry) => entry.code === "FIVE_PERFORMANCE");

		expect(badge).toMatchObject({
			earned: true,
			earnedAt,
			current: 0,
			target: 5,
			progress: 100,
		});
	});

	it("prefers the persisted earnedAt over the derived one", () => {
		const persistedAt = new Date("2026-01-05T12:00:00.000Z");
		const assignments = weeksFrom("2025-12-22T12:00:00.000Z", 4);
		const evaluations = evaluateBadges(assignments, NOW);

		const response = buildBadgeResponse(evaluations, [
			{ code: "FOUR_WEEK_STREAK", earnedAt: persistedAt },
		]);

		const badge = response.find((entry) => entry.code === "FOUR_WEEK_STREAK");

		expect(badge?.earned).toBe(true);
		expect(badge?.earnedAt).toEqual(persistedAt);
	});

	it("floors the progress from current over target", () => {
		const assignments = weeksFrom("2026-03-02T12:00:00.000Z", 3);
		const evaluations = evaluateBadges(
			assignments,
			new Date("2026-03-19T12:00:00.000Z"),
		);

		const response = buildBadgeResponse(evaluations, []);

		const badge = response.find((entry) => entry.code === "FOUR_WEEK_STREAK");

		expect(badge?.progress).toBe(75);
	});

	it("keeps unavailable target-null badges unearned despite invalid input", () => {
		const earnedAt = new Date("2026-03-02T12:00:00.000Z");
		const evaluations = noEvaluations.map((evaluation) =>
			evaluation.code === "TOP_THREE"
				? { ...evaluation, earned: true, earnedAt }
				: evaluation,
		);
		const response = buildBadgeResponse(evaluations, [
			{ code: "TOP_THREE", earnedAt },
		]);

		const podium = response.find((entry) => entry.code === "TOP_THREE");
		const punctual = response.find((entry) => entry.code === "PERFECT_MONTH");

		expect(podium).toMatchObject({
			available: false,
			earned: false,
			earnedAt: null,
			progress: 0,
		});
		expect(punctual).toMatchObject({ earned: false, progress: 0 });
	});

	it("ignores persisted rows whose code is not in the catalog", () => {
		const response = buildBadgeResponse(noEvaluations, [
			{ code: "MENTOR", earnedAt: new Date("2026-03-02T12:00:00.000Z") },
		]);

		expect(response).toHaveLength(10);
		expect(
			response.some((entry) => entry.code === ("MENTOR" as BadgeCode)),
		).toBe(false);
	});
});
