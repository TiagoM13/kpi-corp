import type { AppRouterClient } from "@kpi-corp/api/routers/index";

import {
	CATEGORY_BY_ID,
	type KpiCategory,
	type KpiCategoryId,
} from "@/mocks/kpis";

export type ApiKpiCategory = Awaited<
	ReturnType<AppRouterClient["kpis"]["list"]>
>["items"][number]["category"];

export const API_KPI_CATEGORIES = [
	"PRESENCE",
	"PERFORMANCE",
	"BEHAVIOR",
	"INITIATIVE",
] as const satisfies readonly ApiKpiCategory[];

const ID_OF_API: Record<ApiKpiCategory, KpiCategoryId> = {
	PRESENCE: "presenca",
	PERFORMANCE: "desempenho",
	BEHAVIOR: "comportamento",
	INITIATIVE: "iniciativa",
};

const API_OF_ID: Record<KpiCategoryId, ApiKpiCategory> = {
	presenca: "PRESENCE",
	desempenho: "PERFORMANCE",
	comportamento: "BEHAVIOR",
	iniciativa: "INITIATIVE",
};

export function categoryIdOfApi(category: ApiKpiCategory): KpiCategoryId {
	return ID_OF_API[category];
}

export function apiCategoryOf(id: KpiCategoryId): ApiKpiCategory {
	return API_OF_ID[id];
}

export function categoryOfApi(category: ApiKpiCategory): KpiCategory {
	const found = CATEGORY_BY_ID.get(ID_OF_API[category]);

	if (!found) {
		throw new Error(`Categoria desconhecida: ${category}`);
	}

	return found;
}
