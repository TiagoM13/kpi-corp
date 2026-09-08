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

export const badgeCodeSchema = z.enum([
	"FIRST_POINT",
	"FIVE_PERFORMANCE",
	"ALL_CATEGORIES",
	"TWENTY_FIVE_KPIS",
	"FOUR_WEEK_STREAK",
	"TWELVE_WEEK_STREAK",
	"TEN_MEETINGS",
	"TOP_THREE",
	"PERFECT_MONTH",
	"PODIUM_STREAK",
]);

export const badgeRaritySchema = z.enum(["COMUM", "RARA", "EPICA", "LENDARIA"]);

export const badgeSchema = z.object({
	code: badgeCodeSchema,
	name: z.string(),
	description: z.string(),
	icon: z.string(),
	rarity: badgeRaritySchema,
	available: z.boolean(),
	earned: z.boolean(),
	earnedAt: z.date().nullable(),
	current: z.number(),
	target: z.number().nullable(),
	progress: z.number(),
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
	badges: z.array(badgeSchema).length(10),
});

export const publicProfileResponseSchema = z.object({
	member: memberBaseSchema,
	total: z.number(),
	categories: scoreCategoriesSchema,
	level: levelSchema,
	kpis: z.array(myKpiSchema),
	badges: z.array(badgeSchema).length(10),
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
