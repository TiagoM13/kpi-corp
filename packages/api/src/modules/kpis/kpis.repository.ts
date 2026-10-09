import prisma from "@kpi-corp/db";
import type { Kpi } from "@kpi-corp/db/prisma/generated/client";
import { Prisma } from "@kpi-corp/db/prisma/generated/client";
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

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";
const RECORD_NOT_FOUND = "P2025";

function isPrismaError(error: unknown, code: string) {
	return (
		error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
	);
}

async function write(run: () => Promise<Kpi>) {
	try {
		return { outcome: "OK" as const, kpi: await run() };
	} catch (error) {
		if (isPrismaError(error, UNIQUE_CONSTRAINT_VIOLATION)) {
			return { outcome: "NAME_TAKEN" as const };
		}

		if (isPrismaError(error, RECORD_NOT_FOUND)) {
			return { outcome: "NOT_FOUND" as const };
		}

		throw error;
	}
}

export const kpisRepository = {
	create(data: KpiWritableData) {
		return write(() => prisma.kpi.create({ data }));
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

			const uses = await tx.kpiAssignment.groupBy({
				by: ["kpiId"],
				where: {
					kpiId: { in: items.map((item) => item.id) },
					revokedAt: null,
				},
				_count: { _all: true },
			});

			return {
				items,
				total,
				uses: uses.map((use) => ({ kpiId: use.kpiId, count: use._count._all })),
			};
		});
	},

	findById(id: string) {
		return prisma.kpi.findUnique({ where: { id } });
	},

	update(id: string, data: KpiWritableData) {
		return write(() => prisma.kpi.update({ where: { id }, data }));
	},

	setStatus(id: string, active: boolean) {
		return write(() => prisma.kpi.update({ where: { id }, data: { active } }));
	},
};

export type KpisRepository = typeof kpisRepository;
