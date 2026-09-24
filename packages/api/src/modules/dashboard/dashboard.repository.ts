import prisma from "@kpi-corp/db";

import type { RankingWindow } from "../../shared/ranking";
import { addDays } from "../../shared/time";

const MEMBER_SELECT = {
	id: true,
	name: true,
	position: true,
	role: true,
} as const;

function windowWhere(window: RankingWindow) {
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

	aggregateTeam(window: RankingWindow | null) {
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

	listRecentValidAssignments(userId: string, take: number) {
		return prisma.kpiAssignment.findMany({
			where: { userId, revokedAt: null },
			orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
			take,
			select: {
				id: true,
				kpiId: true,
				points: true,
				note: true,
				assignedAt: true,
				kpi: { select: { name: true, category: true } },
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

	async assignmentTotals(window: RankingWindow) {
		const result = await prisma.kpiAssignment.aggregate({
			where: { revokedAt: null, assignedAt: windowWhere(window) },
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
			},
		});
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
