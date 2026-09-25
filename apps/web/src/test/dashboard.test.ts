import { describe, expect, it } from "vitest";

import { activityOf, recentActivity } from "@/lib/activity-feed";
import {
	firstNameOf,
	formatRelative,
	greetingFor,
	STAGNANT_THRESHOLD_DAYS,
	stagnantMembers,
	teamTotals,
} from "@/lib/dashboard";
import { historyOf } from "@/lib/member-stats";
import { MOCK_ACTIVITY } from "@/mocks/activity";
import { MOCK_MEMBERS } from "@/mocks/members";

describe("teamTotals", () => {
	it("soma os pontos de todo mundo", () => {
		const expected = MOCK_MEMBERS.reduce(
			(total, member) => total + member.points,
			0,
		);

		expect(teamTotals().points).toBe(expected);
		expect(teamTotals().points).toBe(11640);
	});

	it("conta o time e os estagnados", () => {
		const totals = teamTotals();

		expect(totals.totalMembers).toBe(MOCK_MEMBERS.length);
		expect(totals.stagnantCount).toBe(3);
	});
});

describe("stagnantMembers", () => {
	it("pega so quem passou do limite", () => {
		const stagnant = stagnantMembers();

		expect(
			stagnant.every(
				(member) => (member.stagnantDays ?? 0) >= STAGNANT_THRESHOLD_DAYS,
			),
		).toBe(true);
	});

	it("ordena do mais esquecido para o menos", () => {
		const days = stagnantMembers().map((member) => member.stagnantDays ?? 0);

		expect(days).toStrictEqual([...days].sort((a, b) => b - a));
		expect(days).toStrictEqual([16, 11, 8]);
	});
});

describe("formatRelative", () => {
	const now = new Date("2026-09-25T12:00:00.000Z");

	it.each([
		["2026-09-25T11:58:00.000Z", "há 2 minutos"],
		["2026-09-25T09:00:00.000Z", "há 3 horas"],
		["2026-09-24T12:00:00.000Z", "ontem"],
		["2026-09-19T12:00:00.000Z", "há 6 dias"],
	])("%s vira %j", (iso, expected) => {
		expect(formatRelative(new Date(iso), now)).toBe(expected);
	});
});

describe("greetingFor", () => {
	it.each([
		["2026-05-03T06:00:00", "Bom dia"],
		["2026-05-03T11:59:00", "Bom dia"],
		["2026-05-03T12:00:00", "Boa tarde"],
		["2026-05-03T17:59:00", "Boa tarde"],
		["2026-05-03T18:00:00", "Boa noite"],
		["2026-05-03T23:30:00", "Boa noite"],
	])("as %s diz %s", (iso, expected) => {
		expect(greetingFor(new Date(iso))).toBe(expected);
	});
});

describe("firstNameOf", () => {
	it.each([
		["Ana Beatriz Souza", "Ana"],
		["Bruno", "Bruno"],
		["  Carla Menezes  ", "Carla"],
	])("%j vira %j", (full, first) => {
		expect(firstNameOf(full)).toBe(first);
	});
});

describe("recentActivity", () => {
	it("resolve membro, KPI e categoria de cada entrada", () => {
		const [first] = recentActivity(1);

		expect(first?.member.name).toBe("Carla Menezes");
		expect(first?.kpi.name).toBe("Boa ideia em reunião");
		expect(first?.category.label).toBe("Iniciativa");
	});

	it("respeita o limite pedido", () => {
		expect(recentActivity(5)).toHaveLength(5);
		expect(recentActivity()).toHaveLength(MOCK_ACTIVITY.length);
	});

	it("mantem a ordem do mock", () => {
		expect(recentActivity(3).map((entry) => entry.activity.id)).toStrictEqual([
			"a1",
			"a2",
			"a3",
		]);
	});
});

describe("activityOf", () => {
	it("member-stats.historyOf usa a mesma fonte", () => {
		expect(historyOf("u3")).toBe(activityOf("u3"));
		expect(historyOf("u9")).toBe(activityOf("u9"));
	});

	it("devolve vazio para quem nunca pontuou", () => {
		expect(activityOf("u9")).toHaveLength(0);
	});
});
