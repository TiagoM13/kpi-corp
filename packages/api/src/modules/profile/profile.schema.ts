import z from "zod";

export const levelTierSchema = z.enum([
	"INICIANTE",
	"COMPROMETIDO",
	"DESTAQUE",
	"ELITE",
	"LENDA",
]);

export const kpiCategorySchema = z.enum([
	"PRESENCE",
	"PERFORMANCE",
	"BEHAVIOR",
	"INITIATIVE",
]);

export const scoreCategoriesSchema = z.object({
	presence: z.number(),
	performance: z.number(),
	behavior: z.number(),
	initiative: z.number(),
});

export const levelSchema = z.object({
	level: z.number(),
	tier: levelTierSchema,
	currentPoints: z.number(),
	levelFloor: z.number(),
	nextLevel: z.number().nullable(),
	nextLevelPoints: z.number().nullable(),
	progress: z.number(),
	nextTier: levelTierSchema.nullable(),
});

export const myScoreResponseSchema = z.object({
	total: z.number(),
	categories: scoreCategoriesSchema,
	level: levelSchema,
});

export const myKpiSchema = z.object({
	id: z.string(),
	kpiId: z.string(),
	name: z.string(),
	category: kpiCategorySchema,
	points: z.number(),
	note: z.string().nullable(),
	assignedAt: z.date(),
	revokedAt: z.date().nullable(),
});

export const myKpisResponseSchema = z.object({
	items: z.array(myKpiSchema),
});

export const myKpisSummaryResponseSchema = z.object({
	totalCount: z.number(),
	countByCategory: scoreCategoriesSchema,
	scoreByCategory: scoreCategoriesSchema,
	lastAssignment: myKpiSchema.nullable(),
});

const memberBaseSchema = z.object({
	id: z.string(),
	name: z.string(),
	position: z.string().nullable(),
	role: z.enum(["ADMIN", "MEMBER"]),
});

export const myProfileResponseSchema = z.object({
	member: memberBaseSchema.extend({
		email: z.email(),
		active: z.boolean(),
		createdAt: z.date(),
	}),
	total: z.number(),
	categories: scoreCategoriesSchema,
	level: levelSchema,
	kpis: z.array(myKpiSchema),
});

export const publicProfileResponseSchema = z.object({
	member: memberBaseSchema,
	total: z.number(),
	categories: scoreCategoriesSchema,
	level: levelSchema,
	kpis: z.array(myKpiSchema),
});

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

export const myKpisInputSchema = z.object({
	revoked: z.preprocess(booleanFromQuery, z.boolean().optional()),
});

export const memberProfileInputSchema = z.object({
	id: z.uuid(),
});
