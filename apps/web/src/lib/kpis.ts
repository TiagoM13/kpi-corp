import type { AppRouterClient } from "@kpi-corp/api/routers/index";

import { domainCodeOf } from "@/lib/auth";
import { apiCategoryOf, categoryIdOfApi } from "@/lib/categories";
import type { Kpi, KpiCategoryId } from "@/mocks/kpis";

type KpisClient = AppRouterClient["kpis"];

export type ApiKpi = Awaited<ReturnType<KpisClient["list"]>>["items"][number];

export type KpiDraft = {
	name: string;
	description: string;
	category: KpiCategoryId;
	points: number;
};

export function toKpi(kpi: ApiKpi): Kpi {
	return {
		id: kpi.id,
		name: kpi.name,
		description: kpi.description ?? "",
		category: categoryIdOfApi(kpi.category),
		points: kpi.points,
		uses: kpi.uses,
		active: kpi.active,
	};
}

export function kpiInputOf(draft: KpiDraft) {
	const description = draft.description.trim();

	return {
		name: draft.name.trim(),
		description: description === "" ? null : description,
		category: apiCategoryOf(draft.category),
		points: draft.points,
	};
}

export function isKpiNameTaken(error: unknown) {
	return domainCodeOf(error) === "KPI_NAME_TAKEN";
}
