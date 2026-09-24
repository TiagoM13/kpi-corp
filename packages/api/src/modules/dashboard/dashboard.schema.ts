import z from "zod";

import {
	assignmentHistoryItemSchema,
	kpiCategorySchema,
	levelSchema,
} from "../../shared/schemas";

const dashboardMemberSchema = z.object({
	id: z.string(),
	name: z.string(),
	position: z.string().nullable(),
	role: z.enum(["ADMIN", "MEMBER"]),
});

const recentKpiSchema = z.object({
	id: z.string(),
	kpiId: z.string(),
	name: z.string(),
	category: kpiCategorySchema,
	points: z.number(),
	note: z.string().nullable(),
	assignedAt: z.date(),
});

export const memberDashboardResponseSchema = z.object({
	user: dashboardMemberSchema,
	points: z.number(),
	kpiCount: z.number(),
	rankingPosition: z.number().int(),
	teamSize: z.number().int(),
	level: levelSchema,
	recentKpis: z.array(recentKpiSchema),
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

export const adminDashboardResponseSchema = z.object({
	members: z.object({
		active: z.number().int(),
		total: z.number().int(),
	}),
	kpis: weekMonthSchema,
	meetings: weekMonthSchema.extend({ open: z.number().int() }),
	points: weekMonthSchema,
	ranking: z.array(dashboardRankingEntrySchema),
	recentAssignments: z.array(assignmentHistoryItemSchema),
	membersWithoutKpis: z.array(memberWithoutKpisSchema),
});
