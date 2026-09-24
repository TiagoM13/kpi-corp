import z from "zod";

const kpiCategorySchema = z.enum([
	"PRESENCE",
	"PERFORMANCE",
	"BEHAVIOR",
	"INITIATIVE",
]);

const levelTierSchema = z.enum([
	"INICIANTE",
	"COMPROMETIDO",
	"DESTAQUE",
	"ELITE",
	"LENDA",
]);

const levelSchema = z.object({
	level: z.number(),
	tier: levelTierSchema,
	currentPoints: z.number(),
	levelFloor: z.number(),
	nextLevel: z.number().nullable(),
	nextLevelPoints: z.number().nullable(),
	progress: z.number(),
	nextTier: levelTierSchema.nullable(),
});

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

const recentAssignmentSchema = z.object({
	id: z.string(),
	kpiId: z.string(),
	userId: z.string(),
	assignedBy: z.string(),
	meetingId: z.string().nullable(),
	note: z.string().nullable(),
	points: z.number(),
	revokedAt: z.date().nullable(),
	assignedAt: z.date(),
	kpi: z.object({
		id: z.string(),
		name: z.string(),
		category: kpiCategorySchema,
	}),
	user: z.object({
		id: z.string(),
		name: z.string(),
		position: z.string().nullable(),
	}),
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
	recentAssignments: z.array(recentAssignmentSchema),
	membersWithoutKpis: z.array(memberWithoutKpisSchema),
});
