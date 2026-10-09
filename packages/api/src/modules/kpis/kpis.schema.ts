import z from "zod";

import {
	booleanFromQuery,
	emptyAsUndefined,
	kpiCategorySchema,
} from "../../shared/schemas";

export const MIN_KPI_POINTS = 1;
export const MAX_KPI_POINTS = 100;

const kpiSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	points: z.number(),
	category: kpiCategorySchema,
	active: z.boolean(),
	createdAt: z.date(),
});

const kpiWritableSchema = z.object({
	name: z.string().trim().min(1).max(120),
	description: z.string().trim().max(500).nullish(),
	points: z.coerce.number().int().min(MIN_KPI_POINTS).max(MAX_KPI_POINTS),
	category: kpiCategorySchema,
});

export const createKpiInputSchema = kpiWritableSchema;

export const updateKpiInputSchema = kpiWritableSchema.extend({
	id: z.uuid(),
});

export const listKpisInputSchema = z.object({
	category: z.preprocess(emptyAsUndefined, kpiCategorySchema.optional()),
	active: z.preprocess(booleanFromQuery, z.boolean().optional()),
	search: z.preprocess(emptyAsUndefined, z.string().trim().min(1).optional()),
});

export const listKpisResponseSchema = z.object({
	items: z.array(kpiSchema.extend({ uses: z.number().int() })),
	total: z.number(),
});

export const kpiIdInputSchema = z.object({
	id: z.uuid(),
});

export const setKpiStatusInputSchema = z.object({
	id: z.uuid(),
	active: z.boolean(),
});

export const kpiResponseSchema = kpiSchema;
