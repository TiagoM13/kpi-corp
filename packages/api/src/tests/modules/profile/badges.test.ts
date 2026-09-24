import { describe, expect, it } from "vitest";

import {
	ALL_CATEGORIES_TARGET,
	BADGE_CATALOG,
	type BadgeAssignment,
	type BadgeCode,
	type BadgeContext,
	buildBadgeResponse,
	emptyBadgeContext,
	evaluateBadges,
	KPI_CATEGORIES,
	podiumMonths,
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

const ME = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";
const OTHER_A = "b29f5637-0ab1-4de0-b2d2-d364e3903124";
const OTHER_B = "60e3c1d8-f17f-4527-9da6-23ef16299e67";
const OTHER_C = "7d1c2b3a-4e5f-4a6b-9c8d-0e1f2a3b4c5d";
const OTHER_D = "8e2d3c4b-5f6a-4b7c-8d9e-1f2a3b4c5d6e";

function context(overrides: Partial<BadgeContext> = {}): BadgeContext {
	return { ...emptyBadgeContext(ME), ...overrides };
}

function row(userId: string, name: string, points: number, kpiCount: number) {
	return { userId, name, points, kpiCount };
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

	describe("Fase 3 catalog", () => {
		it("marks every catalog entry as available", () => {
			expect(BADGE_CATALOG.every((entry) => entry.available)).toBe(true);
		});

		it.each([
			["TEN_MEETINGS", 10],
			["TOP_THREE", null],
			["PERFECT_MONTH", null],
			["PODIUM_STREAK", 3],
		] as const)("keeps %s unearned without Fase 3 data", (code, target) => {
			const assignments = weeksFrom("2025-12-22T12:00:00.000Z", 12);
			const evaluation = byCode(evaluateBadges(assignments, NOW), code);

			expect(evaluation).toMatchObject({
				earned: false,
				current: 0,
				target,
				earnedAt: null,
			});
		});
	});

	describe("TEN_MEETINGS", () => {
		const presences = (count: number) =>
			Array.from(
				{ length: count },
				(_, index) => new Date(Date.UTC(2026, 0, 5 + index * 3, 14, 0, 0)),
			);

		it("nine presences are not enough", () => {
			const evaluation = byCode(
				evaluateBadges([], NOW, context({ presences: presences(9) })),
				"TEN_MEETINGS",
			);

			expect(evaluation).toMatchObject({
				earned: false,
				current: 9,
				target: 10,
				earnedAt: null,
			});
		});

		it("is earned on the tenth presence, stamped with its presentAt — not the last one", () => {
			const twelve = presences(12);
			const evaluation = byCode(
				evaluateBadges([], NOW, context({ presences: twelve })),
				"TEN_MEETINGS",
			);

			expect(evaluation).toMatchObject({ earned: true, current: 12 });
			expect(evaluation.earnedAt).toEqual(twelve[9]);
			expect(evaluation.earnedAt).not.toEqual(twelve[11]);
		});
	});

	describe("TOP_THREE", () => {
		const team = [
			row(ME, "Caio", 80, 4),
			row(OTHER_A, "Ana", 100, 5),
			row(OTHER_B, "Bia", 90, 5),
			row(OTHER_C, "Davi", 70, 3),
		];
		const mine = [
			assign("2026-02-02T12:00:00.000Z", "PERFORMANCE", 40),
			assign("2026-03-09T12:00:00.000Z", "BEHAVIOR", 40),
		];

		it("1st, 2nd and 3rd earn it; 4th does not", () => {
			const third = byCode(
				evaluateBadges(mine, NOW, context({ team })),
				"TOP_THREE",
			);
			const fourth = byCode(
				evaluateBadges(mine, NOW, context({ userId: OTHER_C, team })),
				"TOP_THREE",
			);

			expect(third).toMatchObject({ earned: true, current: 1, target: null });
			expect(fourth).toMatchObject({ earned: false, current: 0 });
		});

		it("uses the 3B tie-break, name in pt-BR included", () => {
			const tied = [
				row(OTHER_A, "Ana", 100, 5),
				row(OTHER_B, "Bia", 90, 5),
				row(ME, "Érica", 50, 2),
				row(OTHER_C, "Fábio", 50, 2),
			];

			expect(
				byCode(evaluateBadges(mine, NOW, context({ team: tied })), "TOP_THREE")
					.earned,
			).toBe(true);
			expect(
				byCode(
					evaluateBadges(mine, NOW, context({ userId: OTHER_C, team: tied })),
					"TOP_THREE",
				).earned,
			).toBe(false);
		});

		it("a team entirely at zero grants it to nobody", () => {
			const zero = [
				row(ME, "Ana", 0, 0),
				row(OTHER_A, "Bia", 0, 0),
				row(OTHER_B, "Caio", 0, 0),
			];

			const evaluation = byCode(
				evaluateBadges([], NOW, context({ team: zero })),
				"TOP_THREE",
			);

			expect(evaluation).toMatchObject({ earned: false, earnedAt: null });
		});

		it("stamps earnedAt with the member's most recent valid assignment, never now()", () => {
			const evaluation = byCode(
				evaluateBadges(mine, NOW, context({ team })),
				"TOP_THREE",
			);

			expect(evaluation.earnedAt).toEqual(new Date("2026-03-09T12:00:00.000Z"));
			expect(evaluation.earnedAt).not.toEqual(NOW);
		});
	});

	describe("PERFECT_MONTH", () => {
		const since = new Date("2025-12-01T12:00:00.000Z");

		function meeting(
			day: string,
			present: boolean,
			closedAt: string | null = `${day}T15:00:00.000Z`,
		) {
			return {
				date: new Date(day),
				closedAt: closedAt ? new Date(closedAt) : null,
				present,
			};
		}

		function perfect(meetings: ReturnType<typeof meeting>[]) {
			return byCode(
				evaluateBadges([], NOW, context({ memberSince: since, meetings })),
				"PERFECT_MONTH",
			);
		}

		it("present at every closed meeting of a closed month earns it", () => {
			expect(
				perfect([meeting("2026-01-05", true), meeting("2026-01-19", true)]),
			).toMatchObject({ earned: true, current: 1, target: null });
		});

		it("one missed meeting in the month does not", () => {
			expect(
				perfect([meeting("2026-01-05", true), meeting("2026-01-19", false)])
					.earned,
			).toBe(false);
		});

		it("ignores an open meeting in the month", () => {
			expect(
				perfect([
					meeting("2026-01-05", true),
					meeting("2026-01-26", false, null),
				]).earned,
			).toBe(true);
		});

		it("ignores a meeting before the member's createdAt", () => {
			expect(
				perfect([meeting("2025-12-01", false), meeting("2025-12-15", true)])
					.earned,
			).toBe(true);
		});

		it("a month with no closed meeting does not count", () => {
			expect(perfect([meeting("2026-01-26", true, null)]).earned).toBe(false);
			expect(perfect([]).earned).toBe(false);
		});

		it("never grants the current month, even at 100% so far", () => {
			expect(
				perfect([meeting("2026-03-02", true), meeting("2026-03-09", true)])
					.earned,
			).toBe(false);
		});

		it("stamps earnedAt with the closedAt of the month's last meeting", () => {
			const evaluation = perfect([
				meeting("2026-01-05", true),
				meeting("2026-01-19", true, "2026-01-19T18:30:00.000Z"),
				meeting("2026-02-02", true),
			]);

			expect(evaluation.earnedAt).toEqual(new Date("2026-01-19T18:30:00.000Z"));
		});
	});

	describe("PODIUM_STREAK", () => {
		const team = [
			row(ME, "Ana", 0, 0),
			row(OTHER_A, "Bia", 0, 0),
			row(OTHER_B, "Caio", 0, 0),
			row(OTHER_C, "Davi", 0, 0),
			row(OTHER_D, "Eva", 0, 0),
		];

		function leads(month: string) {
			return [
				{
					userId: ME,
					points: 50,
					assignedAt: new Date(`${month}-10T12:00:00.000Z`),
				},
				{
					userId: ME,
					points: 5,
					assignedAt: new Date(`${month}-20T12:00:00.000Z`),
				},
				...[OTHER_A, OTHER_B, OTHER_C, OTHER_D].map((userId) => ({
					userId,
					points: 10,
					assignedAt: new Date(`${month}-12T12:00:00.000Z`),
				})),
			];
		}

		function fifth(month: string) {
			return [
				{
					userId: ME,
					points: 1,
					assignedAt: new Date(`${month}-10T12:00:00.000Z`),
				},
				...[OTHER_A, OTHER_B, OTHER_C, OTHER_D].map((userId) => ({
					userId,
					points: 30,
					assignedAt: new Date(`${month}-12T12:00:00.000Z`),
				})),
			];
		}

		function streak(monthlyAssignments: ReturnType<typeof leads>) {
			return byCode(
				evaluateBadges([], NOW, context({ team, monthlyAssignments })),
				"PODIUM_STREAK",
			);
		}

		it("three consecutive months in the top 3 earn it", () => {
			const evaluation = streak([
				...leads("2025-10"),
				...leads("2025-11"),
				...leads("2025-12"),
			]);

			expect(evaluation).toMatchObject({ earned: true, current: 3, target: 3 });
		});

		it("a gap in the middle breaks it: 3rd, 5th, 3rd, 3rd does not grant", () => {
			const evaluation = streak([
				...leads("2025-09"),
				...fifth("2025-10"),
				...leads("2025-11"),
				...leads("2025-12"),
			]);

			expect(evaluation).toMatchObject({ earned: false, current: 2 });
		});

		it("a month with no team assignment breaks the streak", () => {
			const evaluation = streak([
				...leads("2025-09"),
				...leads("2025-10"),
				...leads("2025-12"),
				...leads("2026-01"),
			]);

			expect(evaluation).toMatchObject({ earned: false, current: 2 });
		});

		it("current is the best historical streak, not the current one", () => {
			const evaluation = streak([
				...leads("2025-04"),
				...leads("2025-05"),
				...leads("2025-06"),
				...leads("2025-07"),
				...leads("2026-02"),
			]);

			expect(evaluation).toMatchObject({ earned: true, current: 4 });
		});

		it("counts a streak across the year boundary (nov, dec, jan)", () => {
			const evaluation = streak([
				...leads("2025-11"),
				...leads("2025-12"),
				...leads("2026-01"),
			]);

			expect(evaluation.earned).toBe(true);
			expect(evaluation.earnedAt).toEqual(new Date("2026-01-20T12:00:00.000Z"));
		});

		it("scans only the last 12 closed months", () => {
			expect(podiumMonths(NOW).map((window) => window.startDay)).toEqual([
				"2025-03-01",
				"2025-04-01",
				"2025-05-01",
				"2025-06-01",
				"2025-07-01",
				"2025-08-01",
				"2025-09-01",
				"2025-10-01",
				"2025-11-01",
				"2025-12-01",
				"2026-01-01",
				"2026-02-01",
			]);

			const evaluation = streak([
				...leads("2025-01"),
				...leads("2025-02"),
				...leads("2025-03"),
			]);

			expect(evaluation).toMatchObject({ earned: false, current: 1 });
		});

		it("the current month never counts — its podium still changes", () => {
			const evaluation = streak([
				...leads("2026-01"),
				...leads("2026-02"),
				...leads("2026-03"),
			]);

			expect(evaluation.earned).toBe(false);
		});

		it("stamps earnedAt inside the third month of the streak", () => {
			const evaluation = streak([
				...leads("2025-10"),
				...leads("2025-11"),
				...leads("2025-12"),
				...leads("2026-01"),
			]);

			expect(evaluation.earnedAt).toEqual(new Date("2025-12-20T12:00:00.000Z"));
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

	it("keeps TOP_THREE earned after the member drops to 5th, with progress 100", () => {
		const earnedAt = new Date("2026-03-02T12:00:00.000Z");
		const response = buildBadgeResponse(noEvaluations, [
			{ code: "TOP_THREE", earnedAt },
		]);

		expect(response.find((entry) => entry.code === "TOP_THREE")).toMatchObject({
			available: true,
			earned: true,
			earnedAt,
			current: 0,
			target: null,
			progress: 100,
		});
	});

	it("keeps target-null badges at progress 0 until earned", () => {
		const response = buildBadgeResponse(noEvaluations, []);

		for (const code of ["TOP_THREE", "PERFECT_MONTH"] as const) {
			expect(
				response.find((entry) => entry.code === code),
				code,
			).toMatchObject({ earned: false, earnedAt: null, progress: 0 });
		}
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
