import z from "zod";

import {
	assignmentHistoryItemSchema,
	emptyAsUndefined,
	levelSchema,
} from "../../shared/schemas";

const dashboardMemberSchema = z.object({
	id: z.string(),
	name: z.string(),
	position: z.string().nullable(),
	role: z.enum(["ADMIN", "MEMBER"]),
});

export const memberDashboardResponseSchema = z.object({
	user: dashboardMemberSchema,
	points: z.number(),
	kpiCount: z.number(),
	rankingPosition: z.number().int(),
	teamSize: z.number().int(),
	level: levelSchema,
	weekPoints: z.number(),
	weekSeries: z.array(z.number()),
	rankingChange: z.number().int().nullable(),
});

const dashboardRankingEntrySchema = z.object({
	position: z.number().int(),
	member: dashboardMemberSchema,
	points: z.number(),
	kpiCount: z.number(),
});

const memberWithoutKpisSchema = z.object({
	id: z.string(),
	name: z.string(),
	position: z.string().nullable(),
	lastAssignmentAt: z.date().nullable(),
	daysWithout: z.number().int(),
});

const weekMonthSchema = z.object({
	week: z.number(),
	month: z.number(),
});

const moverSchema = z.object({
	position: z.number().int(),
	member: dashboardMemberSchema,
	points: z.number(),
	kpiCount: z.number().int(),
	change: z.number().int().nullable(),
	series: z.array(z.number()),
});

export const adminDashboardResponseSchema = z.object({
	members: z.object({
		active: z.number().int(),
		total: z.number().int(),
	}),
	kpis: weekMonthSchema.extend({ weekDelta: z.number().int().nullable() }),
	meetings: weekMonthSchema.extend({ open: z.number().int() }),
	points: weekMonthSchema.extend({
		total: z.number(),
		monthDelta: z.number().int().nullable(),
	}),
	withoutKpisDays: z.number().int(),
	trends: z.object({
		points: z.array(z.number()),
		kpis: z.array(z.number()),
	}),
	movers: z.array(moverSchema),
	ranking: z.array(dashboardRankingEntrySchema),
	recentAssignments: z.array(assignmentHistoryItemSchema),
	membersWithoutKpis: z.array(memberWithoutKpisSchema),
});

const seriesPeriodSchema = z.enum(["7d", "30d", "90d", "all"]);

export const pointsSeriesInputSchema = z.object({
	period: z.preprocess(emptyAsUndefined, seriesPeriodSchema.default("90d")),
});

export const pointsSeriesResponseSchema = z.object({
	period: seriesPeriodSchema,
	buckets: z.array(
		z.object({
			start: z.string(),
			points: z.number().int(),
			kpiCount: z.number().int(),
		}),
	),
});
