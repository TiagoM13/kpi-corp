import { describe, expect, it } from "vitest";

import { MOCK_KPIS } from "@/mocks/kpis";
import {
	MAX_NAME_LENGTH,
	MAX_POINTS,
	MIN_POINTS,
} from "@/pages/admin/kpis/constants";
import { kpiFormDefaults, kpiFormSchema } from "@/pages/admin/kpis/schemas";

const VALID = {
	name: "Pair programming",
	description: "Sentou junto para destravar alguem.",
	category: "comportamento",
	points: 12,
};

describe("kpiFormSchema", () => {
	it("aceita um KPI completo", () => {
		expect(kpiFormSchema.safeParse(VALID).success).toBe(true);
	});

	it("aceita descricao vazia", () => {
		expect(kpiFormSchema.safeParse({ ...VALID, description: "" }).success).toBe(
			true,
		);
	});

	it("recusa nome vazio ou so espaco", () => {
		expect(kpiFormSchema.safeParse({ ...VALID, name: "" }).success).toBe(false);
		expect(kpiFormSchema.safeParse({ ...VALID, name: "   " }).success).toBe(
			false,
		);
	});

	it("recusa nome acima do limite", () => {
		const result = kpiFormSchema.safeParse({
			...VALID,
			name: "x".repeat(MAX_NAME_LENGTH + 1),
		});

		expect(result.success).toBe(false);
	});

	it("recusa categoria fora das quatro", () => {
		expect(
			kpiFormSchema.safeParse({ ...VALID, category: "inventada" }).success,
		).toBe(false);
	});

	it.each([
		["abaixo do minimo", MIN_POINTS - 1],
		["acima do maximo", MAX_POINTS + 1],
		["quebrado", 7.5],
		["nao numerico", Number.NaN],
	])("recusa pontuacao %s", (_label, points) => {
		expect(kpiFormSchema.safeParse({ ...VALID, points }).success).toBe(false);
	});

	it("aceita as pontas do intervalo", () => {
		expect(
			kpiFormSchema.safeParse({ ...VALID, points: MIN_POINTS }).success,
		).toBe(true);
		expect(
			kpiFormSchema.safeParse({ ...VALID, points: MAX_POINTS }).success,
		).toBe(true);
	});
});

describe("kpiFormDefaults", () => {
	it("abre vazio para KPI novo", () => {
		expect(kpiFormDefaults(null)).toStrictEqual({
			name: "",
			description: "",
			category: "desempenho",
			points: 10,
		});
	});

	it("espelha o KPI existente sem carregar id, usos nem status", () => {
		const [kpi] = MOCK_KPIS;
		if (!kpi) throw new Error("mock vazio");

		expect(kpiFormDefaults(kpi)).toStrictEqual({
			name: kpi.name,
			description: kpi.description,
			category: kpi.category,
			points: kpi.points,
		});
	});
});
