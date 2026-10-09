import prisma from "@kpi-corp/db";
import { Prisma } from "@kpi-corp/db/prisma/generated/client";

import type { RankingWindow } from "../../shared/ranking";
import { addDays, TIMEZONE } from "../../shared/time";
import type { DailyTotal } from "./dashboard.series";

const MEMBER_SELECT = {
	id: true,
	name: true,
	position: true,
	role: true,
} as const;

type TimeSpan = Pick<RankingWindow, "start" | "end">;

function windowWhere(window: TimeSpan) {
	return { gte: window.start, lt: window.end };
}

// meeting.date é dia de calendário gravado como meia-noite UTC: recorta por dia, não pelo fuso.
function calendarDayWhere(window: RankingWindow) {
	return {
		gte: new Date(`${window.startDay}T00:00:00.000Z`),
		lt: new Date(`${addDays(window.endDay, 1)}T00:00:00.000Z`),
	};
}

export const dashboardRepository = {
	findUserById(id: string) {
		return prisma.user.findUnique({
			where: { id },
			select: { ...MEMBER_SELECT, active: true },
		});
	},

	aggregateTeam(window: TimeSpan | null) {
		return prisma.user.findMany({
			where: { active: true },
			select: {
				...MEMBER_SELECT,
				assignedKpis: {
					where: {
						revokedAt: null,
						...(window ? { assignedAt: windowWhere(window) } : {}),
					},
					select: { points: true },
				},
			},
		});
	},

	async countMembers() {
		const [active, total] = await Promise.all([
			prisma.user.count({ where: { active: true } }),
			prisma.user.count(),
		]);

		return { active, total };
	},

	async assignmentTotals(window: TimeSpan | null) {
		const result = await prisma.kpiAssignment.aggregate({
			where: {
				revokedAt: null,
				...(window ? { assignedAt: windowWhere(window) } : {}),
			},
			_count: { _all: true },
			_sum: { points: true },
		});

		return { count: result._count._all, points: result._sum.points ?? 0 };
	},

	countMeetingsInWindow(window: RankingWindow) {
		return prisma.meeting.count({ where: { date: calendarDayWhere(window) } });
	},

	countOpenMeetings() {
		return prisma.meeting.count({ where: { closedAt: null } });
	},

	listRecentAssignments(take: number) {
		return prisma.kpiAssignment.findMany({
			orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
			take,
			include: {
				kpi: { select: { id: true, name: true, category: true } },
				user: { select: { id: true, name: true, position: true } },
				assigner: { select: { id: true, name: true } },
				meeting: { select: { id: true, title: true } },
			},
		});
	},

	listPointsInWindow(userId: string, window: TimeSpan) {
		return prisma.kpiAssignment.findMany({
			where: { userId, revokedAt: null, assignedAt: windowWhere(window) },
			select: { points: true, assignedAt: true },
		});
	},

	listPointsByUserInWindow(userIds: string[], window: TimeSpan) {
		return prisma.kpiAssignment.findMany({
			where: {
				userId: { in: userIds },
				revokedAt: null,
				assignedAt: windowWhere(window),
			},
			select: { userId: true, points: true, assignedAt: true },
		});
	},

	async dailyTotals(range: {
		start: Date | null;
		end: Date;
	}): Promise<DailyTotal[]> {
		const from = range.start
			? Prisma.sql`AND "assignedAt" >= ${range.start}`
			: Prisma.empty;

		return prisma.$queryRaw<DailyTotal[]>`
			SELECT to_char(("assignedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TIMEZONE}, 'YYYY-MM-DD') AS "day",
				COALESCE(SUM("points"), 0)::int AS "points",
				COUNT(*)::int AS "kpiCount"
			FROM "kpi_assignment"
			WHERE "revokedAt" IS NULL AND "assignedAt" < ${range.end} ${from}
			GROUP BY 1
			ORDER BY 1`;
	},

	listActiveMembersWithLastValidAssignment() {
		return prisma.user.findMany({
			where: { active: true },
			select: {
				id: true,
				name: true,
				position: true,
				createdAt: true,
				assignedKpis: {
					where: { revokedAt: null },
					orderBy: { assignedAt: "desc" },
					take: 1,
					select: { assignedAt: true },
				},
			},
		});
	},
};

export type DashboardRepository = typeof dashboardRepository;
