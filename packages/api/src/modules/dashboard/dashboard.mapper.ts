import type {
	Kpi as PrismaKpi,
	KpiAssignment as PrismaKpiAssignment,
	User as PrismaUser,
} from "@kpi-corp/db/prisma/generated/client";
import type { KpiCategory } from "@kpi-corp/db/prisma/generated/enums";

import type { RankableRow } from "../../shared/ranking";

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

export type AggregatedMember = DashboardMember & {
	assignedKpis: { points: number }[];
};

export function toRankableRow(member: AggregatedMember): RankableRow {
	return {
		userId: member.id,
		name: member.name,
		points: member.assignedKpis.reduce((sum, item) => sum + item.points, 0),
		kpiCount: member.assignedKpis.length,
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

export type RecentAssignment = {
	id: string;
	kpiId: string;
	userId: string;
	assignedBy: string;
	meetingId: string | null;
	note: string | null;
	points: number;
	revokedAt: Date | null;
	assignedAt: Date;
	kpi: { id: string; name: string; category: KpiCategory };
	user: { id: string; name: string; position: string | null };
};

export function mapRecentAssignment(
	assignment: Pick<
		PrismaKpiAssignment,
		| "id"
		| "kpiId"
		| "userId"
		| "assignedBy"
		| "meetingId"
		| "note"
		| "points"
		| "revokedAt"
		| "assignedAt"
	> & {
		kpi: Pick<PrismaKpi, "id" | "name" | "category">;
		user: Pick<PrismaUser, "id" | "name" | "position">;
	},
): RecentAssignment {
	return {
		id: assignment.id,
		kpiId: assignment.kpiId,
		userId: assignment.userId,
		assignedBy: assignment.assignedBy,
		meetingId: assignment.meetingId,
		note: assignment.note,
		points: assignment.points,
		revokedAt: assignment.revokedAt,
		assignedAt: assignment.assignedAt,
		kpi: {
			id: assignment.kpi.id,
			name: assignment.kpi.name,
			category: assignment.kpi.category,
		},
		user: {
			id: assignment.user.id,
			name: assignment.user.name,
			position: assignment.user.position,
		},
	};
}
