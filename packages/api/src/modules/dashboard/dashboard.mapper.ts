import type {
	Kpi as PrismaKpi,
	KpiAssignment as PrismaKpiAssignment,
	User as PrismaUser,
} from "@kpi-corp/db/prisma/generated/client";
import type { KpiCategory } from "@kpi-corp/db/prisma/generated/enums";

export type DashboardMember = {
	id: string;
	name: string;
	position: string | null;
	role: PrismaUser["role"];
};

export function mapDashboardMember(
	user: Pick<PrismaUser, "id" | "name" | "position" | "role">,
): DashboardMember {
	return {
		id: user.id,
		name: user.name,
		position: user.position,
		role: user.role,
	};
}

export type RecentKpi = {
	id: string;
	kpiId: string;
	name: string;
	category: KpiCategory;
	points: number;
	note: string | null;
	assignedAt: Date;
};

export function mapRecentKpi(
	assignment: Pick<
		PrismaKpiAssignment,
		"id" | "kpiId" | "points" | "note" | "assignedAt"
	> & { kpi: Pick<PrismaKpi, "name" | "category"> },
): RecentKpi {
	return {
		id: assignment.id,
		kpiId: assignment.kpiId,
		name: assignment.kpi.name,
		category: assignment.kpi.category,
		points: assignment.points,
		note: assignment.note,
		assignedAt: assignment.assignedAt,
	};
}
