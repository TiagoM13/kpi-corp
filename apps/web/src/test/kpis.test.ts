import { ORPCError } from "@orpc/client";
import { describe, expect, it } from "vitest";

import { isKpiNameTaken, kpiInputOf, toKpi } from "@/lib/kpis";

describe("toKpi", () => {
	it("traduz categoria e descricao nula para o formato das telas", () => {
		expect(
			toKpi({
				id: "k1",
				name: "Mentoria",
				description: null,
				points: 20,
				category: "BEHAVIOR",
				active: true,
				uses: 4,
				createdAt: new Date(),
			}),
		).toStrictEqual({
			id: "k1",
			name: "Mentoria",
			description: "",
			category: "comportamento",
			points: 20,
			uses: 4,
			active: true,
		});
	});
});

describe("kpiInputOf", () => {
	it("apara os textos e manda descricao vazia como null", () => {
		expect(
			kpiInputOf({
				name: "  Mentoria ",
				description: "   ",
				category: "presenca",
				points: 5,
			}),
		).toStrictEqual({
			name: "Mentoria",
			description: null,
			category: "PRESENCE",
			points: 5,
		});
	});
});

describe("isKpiNameTaken", () => {
	it("reconhece o conflito pelo codigo de dominio, nao pela mensagem", () => {
		expect(
			isKpiNameTaken(
				new ORPCError("CONFLICT", { data: { code: "KPI_NAME_TAKEN" } }),
			),
		).toBe(true);
		expect(isKpiNameTaken(new ORPCError("CONFLICT"))).toBe(false);
		expect(isKpiNameTaken(new Error("KPI_NAME_TAKEN"))).toBe(false);
	});
});
