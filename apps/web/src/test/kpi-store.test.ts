import { beforeEach, describe, expect, it, vi } from "vitest";

import { type KpiDraft, useKpiStore } from "@/lib/kpi-store";
import { MOCK_KPIS } from "@/mocks/kpis";

const STORAGE_KEY = "kpicorp.mock-kpis";

const DRAFT: KpiDraft = {
	name: "Pair programming",
	description: "Sentou junto para destravar alguem.",
	category: "comportamento",
	points: 12,
};

beforeEach(() => {
	localStorage.clear();
	useKpiStore.setState({ kpis: MOCK_KPIS });
});

function persisted() {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	return JSON.parse(raw) as { state: { kpis: typeof MOCK_KPIS } };
}

describe("useKpiStore", () => {
	it("comeca com o banco de mock", () => {
		expect(useKpiStore.getState().kpis).toStrictEqual(MOCK_KPIS);
	});

	it("cria KPI ativo, sem usos e com id proprio", () => {
		const created = useKpiStore.getState().createKpi(DRAFT);
		const { kpis } = useKpiStore.getState();

		expect(kpis).toHaveLength(MOCK_KPIS.length + 1);
		expect(created.active).toBe(true);
		expect(created.uses).toBe(0);
		expect(created.id).not.toBe("");
		expect(MOCK_KPIS.some((kpi) => kpi.id === created.id)).toBe(false);
	});

	it("nao muda o mock original ao criar", () => {
		useKpiStore.getState().createKpi(DRAFT);

		expect(MOCK_KPIS).toHaveLength(10);
	});

	it("edita preservando id, usos e status", () => {
		useKpiStore.getState().updateKpi("k1", { ...DRAFT, name: "Presença nova" });
		const kpi = useKpiStore.getState().kpis.find((item) => item.id === "k1");

		expect(kpi?.name).toBe("Presença nova");
		expect(kpi?.points).toBe(12);
		expect(kpi?.uses).toBe(142);
		expect(kpi?.active).toBe(true);
	});

	it("alterna o status nos dois sentidos", () => {
		const { toggleKpi } = useKpiStore.getState();

		toggleKpi("k1");
		expect(
			useKpiStore.getState().kpis.find((kpi) => kpi.id === "k1")?.active,
		).toBe(false);

		toggleKpi("k1");
		expect(
			useKpiStore.getState().kpis.find((kpi) => kpi.id === "k1")?.active,
		).toBe(true);
	});

	it("ignora id que nao existe", () => {
		useKpiStore.getState().toggleKpi("nao-existe");

		expect(useKpiStore.getState().kpis).toStrictEqual(MOCK_KPIS);
	});

	it("grava o banco no localStorage", () => {
		useKpiStore.getState().createKpi(DRAFT);

		expect(persisted()?.state.kpis).toHaveLength(MOCK_KPIS.length + 1);
	});

	it("continua funcionando quando o localStorage recusa a escrita", () => {
		const spy = vi
			.spyOn(Storage.prototype, "setItem")
			.mockImplementation(() => {
				throw new Error("quota exceeded");
			});

		expect(() => useKpiStore.getState().createKpi(DRAFT)).not.toThrow();
		expect(useKpiStore.getState().kpis).toHaveLength(MOCK_KPIS.length + 1);

		spy.mockRestore();
	});
});
