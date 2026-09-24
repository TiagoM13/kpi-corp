import { Prisma } from "@kpi-corp/db/prisma/generated/client";

import { KpiNotFoundError } from "../../shared/errors/common.errors";
import { KpiNameTakenError } from "./kpis.errors";
import { type Kpi, mapKpi } from "./kpis.mapper";
import {
	type KpiWritableData,
	kpisRepository,
	type ListKpisFilter,
} from "./kpis.repository";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";
const RECORD_NOT_FOUND = "P2025";

function isPrismaError(error: unknown, code: string) {
	return (
		error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
	);
}

export type CreateKpiInput = {
	name: string;
	description?: string | null;
	points: number;
	category: KpiWritableData["category"];
};

export type UpdateKpiInput = CreateKpiInput & { id: string };

function writableFrom(input: CreateKpiInput): KpiWritableData {
	return {
		name: input.name,
		description: input.description ?? null,
		points: input.points,
		category: input.category,
	};
}

export const kpisService = {
	async create(input: CreateKpiInput): Promise<Kpi> {
		try {
			return mapKpi(await kpisRepository.create(writableFrom(input)));
		} catch (error) {
			if (isPrismaError(error, UNIQUE_CONSTRAINT_VIOLATION)) {
				throw new KpiNameTakenError();
			}

			throw error;
		}
	},

	async list(filter: ListKpisFilter) {
		const { items, total } = await kpisRepository.list(filter);

		return { items: items.map(mapKpi), total };
	},

	async getById(id: string): Promise<Kpi> {
		const kpi = await kpisRepository.findById(id);

		if (!kpi) {
			throw new KpiNotFoundError();
		}

		return mapKpi(kpi);
	},

	async update(input: UpdateKpiInput): Promise<Kpi> {
		try {
			return mapKpi(await kpisRepository.update(input.id, writableFrom(input)));
		} catch (error) {
			if (isPrismaError(error, UNIQUE_CONSTRAINT_VIOLATION)) {
				throw new KpiNameTakenError();
			}

			if (isPrismaError(error, RECORD_NOT_FOUND)) {
				throw new KpiNotFoundError();
			}

			throw error;
		}
	},

	async setStatus(id: string, active: boolean): Promise<Kpi> {
		try {
			return mapKpi(await kpisRepository.setStatus(id, active));
		} catch (error) {
			if (isPrismaError(error, RECORD_NOT_FOUND)) {
				throw new KpiNotFoundError();
			}

			throw error;
		}
	},
};

export type KpisService = typeof kpisService;
