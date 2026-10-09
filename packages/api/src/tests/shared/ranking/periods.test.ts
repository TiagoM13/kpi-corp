import { describe, expect, it } from "vitest";

import {
	previousElapsedWindow,
	previousWindow,
	windowOf,
} from "../../../shared/ranking/periods";

// 2026-09-16 era uma quarta-feira.
const WEDNESDAY_MIDNIGHT_SP = new Date("2026-09-16T03:00:00.000Z");

describe("windowOf", () => {
	it("semana ISO começa na segunda e termina no domingo, fuso de São Paulo", () => {
		const window = windowOf("week", WEDNESDAY_MIDNIGHT_SP);

		expect(window).toEqual({
			start: new Date("2026-09-14T03:00:00.000Z"),
			end: new Date("2026-09-21T03:00:00.000Z"),
			startDay: "2026-09-14",
			endDay: "2026-09-20",
		});
	});

	it("usa o calendário de São Paulo, não o UTC, para decidir o dia", () => {
		// 2026-09-15T02:00Z ainda é segunda 23:00 em São Paulo.
		const lateMonday = windowOf("week", new Date("2026-09-15T02:00:00.000Z"));
		const earlyTuesday = windowOf("week", new Date("2026-09-15T03:30:00.000Z"));

		expect(lateMonday.startDay).toBe("2026-09-14");
		expect(earlyTuesday.startDay).toBe("2026-09-14");
	});

	it("1º de janeiro que cai no domingo pertence à semana ISO do ano anterior", () => {
		// 2023-01-01 era domingo; a semana ISO dele começou em 2022-12-26.
		const window = windowOf("week", new Date("2023-01-01T03:00:00.000Z"));

		expect(window.startDay).toBe("2022-12-26");
		expect(window.endDay).toBe("2023-01-01");
	});

	it("mês é de calendário, com virada de ano", () => {
		const september = windowOf("month", WEDNESDAY_MIDNIGHT_SP);
		const december = windowOf("month", new Date("2026-12-15T03:00:00.000Z"));

		expect(september).toMatchObject({
			startDay: "2026-09-01",
			endDay: "2026-09-30",
			start: new Date("2026-09-01T03:00:00.000Z"),
			end: new Date("2026-10-01T03:00:00.000Z"),
		});
		expect(december).toMatchObject({
			startDay: "2026-12-01",
			endDay: "2026-12-31",
			end: new Date("2027-01-01T03:00:00.000Z"),
		});
	});

	it("trimestre é de calendário", () => {
		const q3 = windowOf("quarter", WEDNESDAY_MIDNIGHT_SP);
		const q1 = windowOf("quarter", new Date("2026-02-10T03:00:00.000Z"));

		expect(q3).toMatchObject({ startDay: "2026-07-01", endDay: "2026-09-30" });
		expect(q1).toMatchObject({ startDay: "2026-01-01", endDay: "2026-03-31" });
	});

	it("rejeita period fora das janelas de calendário — all não tem janela", () => {
		expect(() => windowOf("all" as never, WEDNESDAY_MIDNIGHT_SP)).toThrow();
	});

	it("horário de verão não desloca o início da semana — o fuso não tem DST hoje", () => {
		// Fevereiro era época de DST no Brasil antigo; o teste trava o comportamento.
		const window = windowOf("week", new Date("2026-02-18T03:00:00.000Z"));

		expect(window.start).toEqual(new Date("2026-02-16T03:00:00.000Z"));
		expect(window.end).toEqual(new Date("2026-02-23T03:00:00.000Z"));
	});
});

describe("previousWindow", () => {
	it("previousWindow da primeira semana do ano é a última do ano anterior", () => {
		const firstWeek = windowOf("week", new Date("2026-01-01T03:00:00.000Z"));
		const previous = previousWindow("week", firstWeek);

		expect(previous).toMatchObject({
			startDay: "2025-12-22",
			endDay: "2025-12-28",
		});
	});

	it("previousWindow do primeiro mês do ano é dezembro do ano anterior", () => {
		const january = windowOf("month", new Date("2026-01-10T03:00:00.000Z"));
		const previous = previousWindow("month", january);

		expect(previous).toMatchObject({
			startDay: "2025-12-01",
			endDay: "2025-12-31",
		});
	});

	it("previousWindow do primeiro trimestre é o último trimestre do ano anterior", () => {
		const q1 = windowOf("quarter", new Date("2026-02-10T03:00:00.000Z"));
		const previous = previousWindow("quarter", q1);

		expect(previous).toMatchObject({
			startDay: "2025-10-01",
			endDay: "2025-12-31",
		});
	});
});

describe("previousElapsedWindow", () => {
	it("semana: a anterior corta no mesmo ponto da semana em que estamos", () => {
		const window = previousElapsedWindow(
			"week",
			new Date("2026-09-16T12:00:00.000Z"),
		);

		expect(window).toEqual({
			start: new Date("2026-09-07T03:00:00.000Z"),
			end: new Date("2026-09-09T12:00:00.000Z"),
		});
	});

	it("mês: o anterior corta no mesmo ponto do mês em que estamos", () => {
		const window = previousElapsedWindow(
			"month",
			new Date("2026-09-16T12:00:00.000Z"),
		);

		expect(window).toEqual({
			start: new Date("2026-08-01T03:00:00.000Z"),
			end: new Date("2026-08-16T12:00:00.000Z"),
		});
	});

	it("mês anterior mais curto: o corte nunca passa do fim dele", () => {
		const window = previousElapsedWindow(
			"month",
			new Date("2026-03-31T12:00:00.000Z"),
		);

		expect(window).toEqual({
			start: new Date("2026-02-01T03:00:00.000Z"),
			end: new Date("2026-03-01T03:00:00.000Z"),
		});
	});

	it("no primeiro instante do período o corte é vazio", () => {
		const window = previousElapsedWindow(
			"week",
			new Date("2026-09-14T03:00:00.000Z"),
		);

		expect(window.start).toEqual(new Date("2026-09-07T03:00:00.000Z"));
		expect(window.end).toEqual(window.start);
	});
});
