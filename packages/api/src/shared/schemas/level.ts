import z from "zod";

export const levelTierSchema = z.enum([
	"INICIANTE",
	"COMPROMETIDO",
	"DESTAQUE",
	"ELITE",
	"LENDA",
]);

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
