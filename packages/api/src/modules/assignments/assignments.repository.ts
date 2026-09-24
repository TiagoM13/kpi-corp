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

export type ListAssignmentsFilter = ListMemberAssignmentsFilter & {
	userId?: string;
	kpiId?: string;
	from?: Date;
	to?: Date;
	page: number;
	limit: number;
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

function historyWhereFrom(filter: ListAssignmentsFilter) {
	const assignedAt =
		filter.from || filter.to
			? {
					...(filter.from ? { gte: filter.from } : {}),
					...(filter.to ? { lt: filter.to } : {}),
				}
			: undefined;

	return {
		...whereFrom(filter),
		...(filter.userId ? { userId: filter.userId } : {}),
		...(filter.kpiId ? { kpiId: filter.kpiId } : {}),
		...(assignedAt ? { assignedAt } : {}),
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

	list(filter: ListAssignmentsFilter) {
		const where = historyWhereFrom(filter);

		return prisma.$transaction(async (tx) => {
			const [items, total] = await Promise.all([
				tx.kpiAssignment.findMany({
					where,
					orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
					skip: (filter.page - 1) * filter.limit,
					take: filter.limit,
					include: {
						kpi: KPI_INCLUDE,
						user: { select: { id: true, name: true, position: true } },
					},
				}),
				tx.kpiAssignment.count({ where }),
			]);

			return { items, total };
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
