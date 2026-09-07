import prisma from "@kpi-corp/db";

import type { KpiCategory } from "@kpi-corp/db/prisma/generated/enums";

export type ScoredAssignmentRow = {
	points: number;
	kpi: { category: KpiCategory };
};

export type MyAssignmentsFilter = {
	revoked?: boolean;
};

const KPI_SELECT = { select: { name: true, category: true } } as const;

function revokedWhere(filter: MyAssignmentsFilter) {
	return filter.revoked === undefined
		? {}
		: { revokedAt: filter.revoked ? { not: null } : null };
}

export const profileRepository = {
	findUserById(id: string) {
		return prisma.user.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				email: true,
				position: true,
				role: true,
				active: true,
				createdAt: true,
			},
		});
	},

	findActivePublicUserById(id: string) {
		return prisma.user.findFirst({
			where: { id, active: true },
			select: { id: true, name: true, position: true, role: true },
		});
	},

	listScoredAssignments(userId: string): Promise<ScoredAssignmentRow[]> {
		return prisma.kpiAssignment.findMany({
			where: { userId, revokedAt: null },
			select: { points: true, kpi: { select: { category: true } } },
		});
	},

	listAssignments(userId: string, filter: MyAssignmentsFilter) {
		return prisma.kpiAssignment.findMany({
			where: { userId, ...revokedWhere(filter) },
			orderBy: { assignedAt: "desc" },
			select: {
				id: true,
				kpiId: true,
				points: true,
				note: true,
				assignedAt: true,
				revokedAt: true,
				kpi: KPI_SELECT,
			},
		});
	},
};

export type ProfileRepository = typeof profileRepository;
