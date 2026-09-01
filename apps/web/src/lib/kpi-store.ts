import { create } from "zustand";
import {
	createJSONStorage,
	persist,
	type StateStorage,
} from "zustand/middleware";
import { type Kpi, type KpiCategoryId, MOCK_KPIS } from "@/mocks/kpis";

export type KpiDraft = {
	name: string;
	description: string;
	category: KpiCategoryId;
	points: number;
};

const STORAGE_KEY = "kpicorp.mock-kpis";

const fallback = new Map<string, string>();

const safeStorage: StateStorage = {
	getItem: (name) => {
		try {
			return localStorage.getItem(name);
		} catch {
			return fallback.get(name) ?? null;
		}
	},
	setItem: (name, value) => {
		try {
			localStorage.setItem(name, value);
		} catch {
			fallback.set(name, value);
		}
	},
	removeItem: (name) => {
		try {
			localStorage.removeItem(name);
		} catch {
			fallback.delete(name);
		}
	},
};

let sequence = 0;

function nextId() {
	sequence += 1;
	return `k-${Date.now()}-${sequence}`;
}

type KpiStore = {
	kpis: Kpi[];
	createKpi: (draft: KpiDraft) => Kpi;
	updateKpi: (id: string, draft: KpiDraft) => void;
	toggleKpi: (id: string) => void;
};

export const useKpiStore = create<KpiStore>()(
	persist(
		(set) => ({
			kpis: MOCK_KPIS,

			createKpi: (draft) => {
				const kpi: Kpi = { ...draft, id: nextId(), uses: 0, active: true };
				set((state) => ({ kpis: [...state.kpis, kpi] }));
				return kpi;
			},

			updateKpi: (id, draft) =>
				set((state) => ({
					kpis: state.kpis.map((kpi) =>
						kpi.id === id ? { ...kpi, ...draft } : kpi,
					),
				})),

			toggleKpi: (id) =>
				set((state) => ({
					kpis: state.kpis.map((kpi) =>
						kpi.id === id ? { ...kpi, active: !kpi.active } : kpi,
					),
				})),
		}),
		{
			name: STORAGE_KEY,
			version: 1,
			storage: createJSONStorage(() => safeStorage),
			partialize: (state) => ({ kpis: state.kpis }),
		},
	),
);

export const selectKpis = (state: KpiStore) => state.kpis;
export const selectCreateKpi = (state: KpiStore) => state.createKpi;
export const selectUpdateKpi = (state: KpiStore) => state.updateKpi;
export const selectToggleKpi = (state: KpiStore) => state.toggleKpi;
