import type {
	Kpi as PrismaKpi,
	KpiAssignment as PrismaKpiAssignment,
	User as PrismaUser,
} from "@kpi-corp/db/prisma/generated/client";
import type { KpiCategory } from "@kpi-corp/db/prisma/generated/enums";

import type { LevelInfo } from "./profile.levels";

export type MyKpi = {
	id: string;
	kpiId: string;
	name: string;
	category: KpiCategory;
	points: number;
	note: string | null;
	assignedAt: Date;
	revokedAt: Date | null;
};

export type MyKpiForMapping = Pick<
	PrismaKpiAssignment,
	"id" | "kpiId" | "points" | "note" | "assignedAt" | "revokedAt"
> & {
	kpi: Pick<PrismaKpi, "name" | "category">;
};

export function mapMyKpi(assignment: MyKpiForMapping): MyKpi {
	return {
		id: assignment.id,
		kpiId: assignment.kpiId,
		name: assignment.kpi.name,
		category: assignment.kpi.category,
		points: assignment.points,
		note: assignment.note,
		assignedAt: assignment.assignedAt,
		revokedAt: assignment.revokedAt,
	};
}

export type MemberBase = {
	id: string;
	name: string;
	position: string | null;
	role: PrismaUser["role"];
};

export type MemberBaseForMapping = Pick<
	PrismaUser,
	"id" | "name" | "position" | "role"
>;

export function mapMemberBase(user: MemberBaseForMapping): MemberBase {
	return {
		id: user.id,
		name: user.name,
		position: user.position,
		role: user.role,
	};
}

export type ScoreBlock = {
	total: number;
	categories: Record<
		"presence" | "performance" | "behavior" | "initiative",
		number
	>;
	level: LevelInfo;
};
