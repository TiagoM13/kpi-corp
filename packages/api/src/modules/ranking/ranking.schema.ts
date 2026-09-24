import z from "zod";

import { emptyAsUndefined } from "../../shared/schemas";

export const rankingPeriodSchema = z.enum(["week", "month", "quarter", "all"]);

export const rankingInputSchema = z.object({
	period: z.preprocess(emptyAsUndefined, rankingPeriodSchema.default("all")),
});

// Mesmo shape de memberBaseSchema da 2C — o mesmo dado não pode ter duas
// formas. Redeclarado aqui porque módulo não importa de módulo.
const rankingMemberSchema = z.object({
	id: z.string(),
	name: z.string(),
	position: z.string().nullable(),
	role: z.enum(["ADMIN", "MEMBER"]),
});

export const rankingEntrySchema = z.object({
	position: z.number().int(),
	member: rankingMemberSchema,
	points: z.number(),
	kpiCount: z.number(),
	change: z.number().nullable(),
	isMe: z.boolean(),
});

export const rankingMeSchema = z.object({
	position: z.number().int(),
	points: z.number(),
	kpiCount: z.number(),
	change: z.number().nullable(),
});

export const rankingResponseSchema = z.object({
	period: rankingPeriodSchema,
	periodStart: z.string().nullable(),
	periodEnd: z.string().nullable(),
	items: z.array(rankingEntrySchema),
	me: rankingMeSchema.nullable(),
});
