import z from "zod";

export const MIN_KPI_POINTS = 1;
export const MAX_KPI_POINTS = 100;

export const kpiCategorySchema = z.enum([
	"PRESENCE",
	"PERFORMANCE",
	"BEHAVIOR",
	"INITIATIVE",
]);

const emptyAsUndefined = (value: unknown) =>
	typeof value === "string" && value.trim() === "" ? undefined : value;

const booleanFromQuery = (value: unknown) => {
	if (typeof value !== "string") {
		return value;
	}

	const normalized = value.trim().toLowerCase();

	if (normalized === "") {
		return undefined;
	}

	if (normalized === "true") {
		return true;
	}

	if (normalized === "false") {
		return false;
	}

	return normalized;
};

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
	items: z.array(kpiSchema),
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
