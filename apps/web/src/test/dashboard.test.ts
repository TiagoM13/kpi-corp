import { describe, expect, it } from "vitest";

import { activityOf, recentActivity } from "@/lib/activity-feed";
import {
	firstNameOf,
	formatRelative,
	greetingFor,
	seriesTickLabel,
} from "@/lib/dashboard";
import { historyOf } from "@/lib/member-stats";
import { MOCK_ACTIVITY } from "@/mocks/activity";

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

describe("seriesTickLabel", () => {
	it("dia e semana viram dia e mês curto, sem ponto", () => {
		expect(seriesTickLabel("7d", "2026-09-05", "2026-09-11")).toBe("5 set");
		expect(seriesTickLabel("90d", "2026-06-29", "2026-09-14")).toBe("29 jun");
	});

	it("mês vira só o mês curto quando tudo é do mesmo ano", () => {
		expect(seriesTickLabel("all", "2026-04-01", "2026-09-01")).toBe("abr");
	});

	it("mês de outro ano leva o ano com dois dígitos", () => {
		expect(seriesTickLabel("all", "2025-11-01", "2026-02-01")).toBe("nov 25");
	});
});
