import prisma from "@kpi-corp/db";

import type { KpiCategory } from "@kpi-corp/db/prisma/generated/enums";

export type AssignmentWritableData = {
	kpiId: string;
	userId: string;
	assignedBy: string;
	note: string | null;
	points: number;
};

export type ListMemberAssignmentsFilter = {
	category?: KpiCategory;
	revoked?: boolean;
};

const KPI_INCLUDE = {
	select: { id: true, name: true, category: true },
} as const;

function whereFrom(filter: ListMemberAssignmentsFilter) {
	return {
		...(filter.category ? { kpi: { category: filter.category } } : {}),
		...(filter.revoked === undefined
			? {}
			: { revokedAt: filter.revoked ? { not: null } : null }),
	};
}

export const assignmentsRepository = {
	findKpiById(id: string) {
		return prisma.kpi.findUnique({ where: { id } });
	},

	findUserById(id: string) {
		return prisma.user.findUnique({ where: { id } });
	},

	create(data: AssignmentWritableData) {
		return prisma.kpiAssignment.create({ data, include: { kpi: KPI_INCLUDE } });
	},

	createMany(data: AssignmentWritableData[]) {
		return prisma.$transaction((tx) =>
			Promise.all(
				data.map((item) =>
					tx.kpiAssignment.create({
						data: item,
						include: { kpi: KPI_INCLUDE },
					}),
				),
			),
		);
	},

	listByUser(userId: string, filter: ListMemberAssignmentsFilter) {
		return prisma.kpiAssignment.findMany({
			where: { userId, ...whereFrom(filter) },
			orderBy: { assignedAt: "desc" },
			include: { kpi: KPI_INCLUDE },
		});
	},

	findById(id: string) {
		return prisma.kpiAssignment.findUnique({
			where: { id },
			include: { kpi: KPI_INCLUDE },
		});
	},

	revoke(id: string, revokedAt: Date) {
		return prisma.kpiAssignment.update({
			where: { id },
			data: { revokedAt },
			include: { kpi: KPI_INCLUDE },
		});
	},
};

export type AssignmentsRepository = typeof assignmentsRepository;
