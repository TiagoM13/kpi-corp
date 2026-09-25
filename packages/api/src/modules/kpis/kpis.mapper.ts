import type { Kpi as PrismaKpi } from "@kpi-corp/db/prisma/generated/client";
import type { KpiCategory } from "@kpi-corp/db/prisma/generated/enums";

export type Kpi = {
	id: string;
	name: string;
	description: string | null;
	points: number;
	category: KpiCategory;
	active: boolean;
	createdAt: Date;
};

export type KpiForMapping = Pick<
	PrismaKpi,
	"id" | "name" | "description" | "points" | "category" | "active" | "createdAt"
>;

export function mapKpi(kpi: KpiForMapping): Kpi {
	return {
		id: kpi.id,
		name: kpi.name,
		description: kpi.description,
		points: kpi.points,
		category: kpi.category,
		active: kpi.active,
		createdAt: kpi.createdAt,
	};
}

export type KpiListItem = Kpi & { uses: number };

export function mapKpiListItem(kpi: KpiForMapping, uses: number): KpiListItem {
	return { ...mapKpi(kpi), uses };
}
