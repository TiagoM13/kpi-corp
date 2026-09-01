import prisma from "@kpi-corp/db";

import type { KpiCategory } from "@kpi-corp/db/prisma/generated/enums";

export type KpiWritableData = {
	name: string;
	description: string | null;
	points: number;
	category: KpiCategory;
};

export type ListKpisFilter = {
	category?: KpiCategory;
	active?: boolean;
	search?: string;
};

function whereFrom(filter: ListKpisFilter) {
	return {
		...(filter.category ? { category: filter.category } : {}),
		...(filter.active === undefined ? {} : { active: filter.active }),
		...(filter.search
			? {
					OR: [
						{ name: { contains: filter.search, mode: "insensitive" as const } },
						{
							description: {
								contains: filter.search,
								mode: "insensitive" as const,
							},
						},
					],
				}
			: {}),
	};
}

export const kpisRepository = {
	create(data: KpiWritableData) {
		return prisma.kpi.create({ data });
	},

	list(filter: ListKpisFilter) {
		const where = whereFrom(filter);

		return prisma.$transaction(async (tx) => {
			const [items, total] = await Promise.all([
				tx.kpi.findMany({
					where,
					orderBy: [{ category: "asc" }, { name: "asc" }],
				}),
				tx.kpi.count({ where }),
			]);

			return { items, total };
		});
	},

	findById(id: string) {
		return prisma.kpi.findUnique({ where: { id } });
	},

	update(id: string, data: KpiWritableData) {
		return prisma.kpi.update({ where: { id }, data });
	},

	setStatus(id: string, active: boolean) {
		return prisma.kpi.update({ where: { id }, data: { active } });
	},
};

export type KpisRepository = typeof kpisRepository;
