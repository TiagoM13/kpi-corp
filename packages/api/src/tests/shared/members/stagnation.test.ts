import { describe, expect, it } from "vitest";

import {
	daysWithoutKpi,
	isStagnant,
	WITHOUT_KPIS_DAYS,
} from "../../../shared/members";

const NOW = new Date("2026-09-16T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY_MS);

describe("daysWithoutKpi", () => {
	it("conta a partir da última atribuição válida", () => {
		expect(
			daysWithoutKpi(
				{ lastAssignmentAt: daysAgo(12), createdAt: daysAgo(90) },
				NOW,
			),
		).toBe(12);
	});

	it("sem atribuição, conta a partir do cadastro", () => {
		expect(
			daysWithoutKpi({ lastAssignmentAt: null, createdAt: daysAgo(45) }, NOW),
		).toBe(45);
	});

	it("arredonda para baixo: 29 dias e 23 horas ainda são 29", () => {
		const almost = new Date(NOW.getTime() - (30 * DAY_MS - 60 * 60 * 1000));

		expect(
			daysWithoutKpi({ lastAssignmentAt: almost, createdAt: daysAgo(90) }, NOW),
		).toBe(29);
	});
});

describe("isStagnant", () => {
	it("o limite é de 30 dias, inclusive", () => {
		expect(WITHOUT_KPIS_DAYS).toBe(30);
		expect(isStagnant(29)).toBe(false);
		expect(isStagnant(30)).toBe(true);
		expect(isStagnant(31)).toBe(true);
	});
});
