import type { Kpi, KpiCategoryId } from "@/mocks/kpis";

export type KpiStatusFilter = "all" | "active" | "inactive";

export type KpiFilters = {
	search: string;
	status: KpiStatusFilter;
	categories: KpiCategoryId[];
};

export const EMPTY_KPI_FILTERS: KpiFilters = {
	search: "",
	status: "all",
	categories: [],
};

export function filterKpis(kpis: Kpi[], filters: KpiFilters) {
	const query = filters.search.trim().toLowerCase();
	const categories = new Set(filters.categories);

	return kpis.filter((kpi) => {
		if (filters.status === "active" && !kpi.active) return false;
		if (filters.status === "inactive" && kpi.active) return false;
		if (categories.size > 0 && !categories.has(kpi.category)) return false;
		if (query === "") return true;

		return (
			kpi.name.toLowerCase().includes(query) ||
			kpi.description.toLowerCase().includes(query)
		);
	});
}

export function countActive(kpis: Kpi[]) {
	let total = 0;
	for (const kpi of kpis) {
		if (kpi.active) total += 1;
	}
	return total;
}
