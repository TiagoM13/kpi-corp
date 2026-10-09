import { describe, expect, it } from "vitest";

import {
	buildSeries,
	buildTrends,
	dailyPoints,
	elapsedDays,
	seriesFirstDay,
	trendsFirstDay,
} from "../../../modules/dashboard/dashboard.series";

// 2026-09-16 é quarta-feira; a semana ISO começa em 2026-09-14.
const TODAY = "2026-09-16";

const row = (day: string, points: number, kpiCount = 1) => ({
	day,
	points,
	kpiCount,
});

describe("seriesFirstDay", () => {
	it("7d e 30d começam 6 e 29 dias antes de hoje", () => {
		expect(seriesFirstDay("7d", TODAY)).toBe("2026-09-10");
		expect(seriesFirstDay("30d", TODAY)).toBe("2026-08-18");
	});

	it("90d começa 11 semanas antes da segunda da semana corrente", () => {
		expect(seriesFirstDay("90d", TODAY)).toBe("2026-06-29");
	});

	it("all não tem início fixo: depende do primeiro dado", () => {
		expect(seriesFirstDay("all", TODAY)).toBeNull();
	});
});

describe("buildSeries", () => {
	it("7d devolve sete dias, com zero onde não houve atribuição", () => {
		const series = buildSeries(
			"7d",
			[row("2026-09-12", 30, 2), row("2026-09-16", 10)],
			TODAY,
		);

		expect(series).toHaveLength(7);
		expect(series[0]).toEqual({ start: "2026-09-10", points: 0, kpiCount: 0 });
		expect(series[2]).toEqual({ start: "2026-09-12", points: 30, kpiCount: 2 });
		expect(series[6]).toEqual({ start: "2026-09-16", points: 10, kpiCount: 1 });
	});

	it("30d devolve trinta dias corridos terminando hoje", () => {
		const series = buildSeries("30d", [], TODAY);

		expect(series).toHaveLength(30);
		expect(series[0]?.start).toBe("2026-08-18");
		expect(series[29]?.start).toBe("2026-09-16");
	});

	it("90d agrupa em doze semanas ISO, cada uma rotulada pela segunda-feira", () => {
		const series = buildSeries(
			"90d",
			[
				row("2026-09-14", 10),
				row("2026-09-16", 25, 2),
				row("2026-09-07", 40),
				row("2026-06-29", 5),
			],
			TODAY,
		);

		expect(series).toHaveLength(12);
		expect(series[0]).toEqual({ start: "2026-06-29", points: 5, kpiCount: 1 });
		expect(series[10]).toEqual({
			start: "2026-09-07",
			points: 40,
			kpiCount: 1,
		});
		expect(series[11]).toEqual({
			start: "2026-09-14",
			points: 35,
			kpiCount: 3,
		});
	});

	it("all agrupa por mês, do primeiro mês com dado até o corrente", () => {
		const series = buildSeries(
			"all",
			[row("2026-06-20", 100), row("2026-06-25", 50), row("2026-08-03", 70)],
			TODAY,
		);

		expect(series.map((bucket) => bucket.start)).toEqual([
			"2026-06-01",
			"2026-07-01",
			"2026-08-01",
			"2026-09-01",
		]);
		expect(series.map((bucket) => bucket.points)).toEqual([150, 0, 70, 0]);
	});

	it("all sem nenhum dado devolve só o mês corrente, zerado", () => {
		expect(buildSeries("all", [], TODAY)).toEqual([
			{ start: "2026-09-01", points: 0, kpiCount: 0 },
		]);
	});

	it("all atravessa a virada de ano sem pular mês", () => {
		const series = buildSeries("all", [row("2025-11-10", 10)], "2026-02-05");

		expect(series.map((bucket) => bucket.start)).toEqual([
			"2025-11-01",
			"2025-12-01",
			"2026-01-01",
			"2026-02-01",
		]);
	});
});

describe("buildTrends", () => {
	it("pontos: oito semanas ISO; KPIs: os últimos sete dias", () => {
		const trends = buildTrends(
			[
				row("2026-09-16", 20, 2),
				row("2026-09-15", 10, 1),
				row("2026-08-03", 60, 4),
			],
			TODAY,
		);

		expect(trends.points).toHaveLength(8);
		expect(trends.points[7]).toBe(30);
		expect(trends.points[0]).toBe(0);
		expect(trends.kpis).toEqual([0, 0, 0, 0, 0, 1, 2]);
	});

	it("trendsFirstDay é a segunda-feira de sete semanas atrás", () => {
		expect(trendsFirstDay(TODAY)).toBe("2026-07-27");
	});
});

describe("dailyPoints", () => {
	it("soma por dia do calendário de São Paulo, não por dia UTC", () => {
		// 2026-09-15T02:00Z ainda é 14/09 23h em São Paulo.
		const series = dailyPoints(
			[
				{ assignedAt: new Date("2026-09-15T02:00:00.000Z"), points: 10 },
				{ assignedAt: new Date("2026-09-15T15:00:00.000Z"), points: 5 },
				{ assignedAt: new Date("2026-09-16T15:00:00.000Z"), points: 7 },
			],
			"2026-09-14",
			"2026-09-16",
		);

		expect(series).toEqual([10, 5, 7]);
	});

	it("dia sem atribuição vale zero", () => {
		expect(dailyPoints([], "2026-09-14", "2026-09-16")).toEqual([0, 0, 0]);
	});
});

describe("elapsedDays", () => {
	it("conta a segunda até hoje, inclusive", () => {
		expect(elapsedDays("2026-09-14", "2026-09-14")).toBe(1);
		expect(elapsedDays("2026-09-14", "2026-09-16")).toBe(3);
		expect(elapsedDays("2026-09-14", "2026-09-20")).toBe(7);
	});
});
