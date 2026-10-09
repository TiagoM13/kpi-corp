import { KpiNotFoundError } from "../../shared/errors/common.errors";
import { KpiNameTakenError } from "./kpis.errors";
import { type Kpi, mapKpi, mapKpiListItem } from "./kpis.mapper";
import {
	type KpiWritableData,
	kpisRepository,
	type ListKpisFilter,
} from "./kpis.repository";

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

function kpiOrThrow(
	result: Awaited<ReturnType<typeof kpisRepository.update>>,
): Kpi {
	if (result.outcome === "NAME_TAKEN") {
		throw new KpiNameTakenError();
	}

	if (result.outcome === "NOT_FOUND") {
		throw new KpiNotFoundError();
	}

	return mapKpi(result.kpi);
}

export const kpisService = {
	async create(input: CreateKpiInput): Promise<Kpi> {
		return kpiOrThrow(await kpisRepository.create(writableFrom(input)));
	},

	async list(filter: ListKpisFilter) {
		const { items, total, uses } = await kpisRepository.list(filter);
		const usesByKpi = new Map(uses.map((use) => [use.kpiId, use.count]));

		return {
			items: items.map((item) =>
				mapKpiListItem(item, usesByKpi.get(item.id) ?? 0),
			),
			total,
		};
	},

	async getById(id: string): Promise<Kpi> {
		const kpi = await kpisRepository.findById(id);

		if (!kpi) {
			throw new KpiNotFoundError();
		}

		return mapKpi(kpi);
	},

	async update(input: UpdateKpiInput): Promise<Kpi> {
		return kpiOrThrow(
			await kpisRepository.update(input.id, writableFrom(input)),
		);
	},

	async setStatus(id: string, active: boolean): Promise<Kpi> {
		return kpiOrThrow(await kpisRepository.setStatus(id, active));
	},
};

export type KpisService = typeof kpisService;
