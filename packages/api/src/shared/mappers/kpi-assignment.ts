import type {
	Kpi as PrismaKpi,
	KpiAssignment as PrismaKpiAssignment,
	Meeting as PrismaMeeting,
	User as PrismaUser,
} from "@kpi-corp/db/prisma/generated/client";
import type { KpiCategory } from "@kpi-corp/db/prisma/generated/enums";

export type AssignmentKpi = {
	id: string;
	name: string;
	category: KpiCategory;
};

export type KpiAssignment = {
	id: string;
	kpiId: string;
	userId: string;
	assignedBy: string;
	meetingId: string | null;
	note: string | null;
	points: number;
	revokedAt: Date | null;
	assignedAt: Date;
	kpi: AssignmentKpi;
};

export type KpiAssignmentForMapping = Pick<
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
};

export function mapKpiAssignment(
	assignment: KpiAssignmentForMapping,
): KpiAssignment {
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
	};
}

export type AssignmentHistoryItem = KpiAssignment & {
	user: { id: string; name: string; position: string | null };
	assigner: { id: string; name: string };
	meeting: { id: string; title: string } | null;
};

export type AssignmentHistoryItemForMapping = KpiAssignmentForMapping & {
	user: Pick<PrismaUser, "id" | "name" | "position">;
	assigner: Pick<PrismaUser, "id" | "name">;
	meeting: Pick<PrismaMeeting, "id" | "title"> | null;
};

export function mapAssignmentHistoryItem(
	assignment: AssignmentHistoryItemForMapping,
): AssignmentHistoryItem {
	return {
		...mapKpiAssignment(assignment),
		user: {
			id: assignment.user.id,
			name: assignment.user.name,
			position: assignment.user.position,
		},
		assigner: {
			id: assignment.assigner.id,
			name: assignment.assigner.name,
		},
		meeting: assignment.meeting
			? { id: assignment.meeting.id, title: assignment.meeting.title }
			: null,
	};
}
