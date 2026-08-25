import { describe, expect, it } from "vitest";

import {
	countActive,
	EMPTY_KPI_FILTERS,
	filterKpis,
	type KpiFilters,
} from "@/lib/kpi-filters";
import { MOCK_KPIS } from "@/mocks/kpis";

function withFilters(patch: Partial<KpiFilters>) {
	return filterKpis(MOCK_KPIS, { ...EMPTY_KPI_FILTERS, ...patch });
}

describe("countActive", () => {
	it("conta so os KPIs ligados", () => {
		expect(countActive(MOCK_KPIS)).toBe(9);
		expect(MOCK_KPIS).toHaveLength(10);
	});
});

describe("filterKpis", () => {
	it("devolve tudo sem filtro", () => {
		expect(withFilters({})).toHaveLength(MOCK_KPIS.length);
	});

	it("filtra por status", () => {
		expect(withFilters({ status: "active" })).toHaveLength(9);
		expect(withFilters({ status: "inactive" })).toHaveLength(1);
	});

	it("filtra por categoria", () => {
		const result = withFilters({ categories: ["presenca"] });

		expect(result).toHaveLength(2);
		expect(result.every((kpi) => kpi.category === "presenca")).toBe(true);
	});

	it("aceita mais de uma categoria ao mesmo tempo", () => {
		const result = withFilters({ categories: ["presenca", "iniciativa"] });

		expect(result).toHaveLength(4);
	});

	it("busca no nome e na descricao", () => {
		expect(withFilters({ search: "mentoria" }).map((kpi) => kpi.id)).toContain(
			"k6",
		);
		expect(withFilters({ search: "incidente" }).map((kpi) => kpi.id)).toContain(
			"k7",
		);
	});

	it("ignora caixa e espaco em volta da busca", () => {
		expect(withFilters({ search: "  MENTORIA  " })).toHaveLength(1);
	});

	it("combina status, categoria e busca", () => {
		const result = withFilters({
			status: "active",
			categories: ["comportamento"],
			search: "feedback",
		});

		expect(result.map((kpi) => kpi.id)).toStrictEqual(["k9"]);
	});

	it("nao devolve o KPI inativo quando o status pede ativos", () => {
		const result = withFilters({
			status: "active",
			categories: ["comportamento"],
		});

		expect(result.some((kpi) => kpi.id === "k10")).toBe(false);
	});

	it("devolve lista vazia quando nada bate", () => {
		expect(withFilters({ search: "nao existe esse kpi" })).toHaveLength(0);
	});
});
