import prisma from "@kpi-corp/db";

import type { KpiCategory } from "@kpi-corp/db/prisma/generated/enums";

import { type RankableRow, toRankableRow } from "../../shared/ranking";
import type { BadgeAssignment } from "./profile.badges";

export type ScoredAssignmentRow = {
	points: number;
	kpi: { category: KpiCategory };
};

export type MyAssignmentsFilter = {
	revoked?: boolean;
	positiveOnly?: boolean;
};

const BADGE_ASSIGNMENT_WHERE = { revokedAt: null, points: { gt: 0 } } as const;

const KPI_SELECT = { select: { name: true, category: true } } as const;

function revokedWhere(filter: MyAssignmentsFilter) {
	return filter.revoked === undefined
		? {}
		: { revokedAt: filter.revoked ? { not: null } : null };
}

export const profileRepository = {
	findUserById(id: string) {
		return prisma.user.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				email: true,
				position: true,
				role: true,
				active: true,
				createdAt: true,
			},
		});
	},

	findActivePublicUserById(id: string) {
		return prisma.user.findFirst({
			where: { id, active: true },
			select: { id: true, name: true, position: true, role: true },
		});
	},

	listScoredAssignments(userId: string): Promise<ScoredAssignmentRow[]> {
		return prisma.kpiAssignment.findMany({
			where: { userId, revokedAt: null },
			select: { points: true, kpi: { select: { category: true } } },
		});
	},

	listAssignments(userId: string, filter: MyAssignmentsFilter) {
		return prisma.kpiAssignment.findMany({
			where: {
				userId,
				...revokedWhere(filter),
				...(filter.positiveOnly ? { points: { gt: 0 } } : {}),
			},
			orderBy: { assignedAt: "desc" },
			select: {
				id: true,
				kpiId: true,
				points: true,
				note: true,
				assignedAt: true,
				revokedAt: true,
				kpi: KPI_SELECT,
			},
		});
	},

	listValidAssignments(userId: string): Promise<BadgeAssignment[]> {
		return prisma.kpiAssignment.findMany({
			where: { userId, ...BADGE_ASSIGNMENT_WHERE },
			orderBy: { assignedAt: "asc" },
			select: {
				points: true,
				assignedAt: true,
				kpi: { select: { category: true } },
			},
		});
	},

	async listPresences(userId: string): Promise<Date[]> {
		const rows = await prisma.meetingAttendee.findMany({
			where: { userId, presentAt: { not: null } },
			orderBy: { presentAt: "asc" },
			select: { presentAt: true },
		});

		return rows.flatMap((row) => (row.presentAt ? [row.presentAt] : []));
	},

	async listTeamScores(): Promise<RankableRow[]> {
		const users = await prisma.user.findMany({
			where: { active: true },
			select: {
				id: true,
				name: true,
				assignedKpis: {
					where: BADGE_ASSIGNMENT_WHERE,
					select: { points: true },
				},
			},
		});

		return users.map((user) => ({
			userId: user.id,
			name: user.name,
			points: user.assignedKpis.reduce((sum, item) => sum + item.points, 0),
			kpiCount: user.assignedKpis.length,
		}));
	},

	async listTeamRanking(): Promise<RankableRow[]> {
		const users = await prisma.user.findMany({
			where: { active: true },
			select: {
				id: true,
				name: true,
				assignedKpis: {
					where: { revokedAt: null },
					select: { points: true },
				},
			},
		});

		return users.map(toRankableRow);
	},

	listTeamScoresByMonth(window: { start: Date; end: Date }) {
		return prisma.kpiAssignment.findMany({
			where: {
				...BADGE_ASSIGNMENT_WHERE,
				assignedAt: { gte: window.start, lt: window.end },
				user: { active: true },
			},
			select: { userId: true, points: true, assignedAt: true },
		});
	},

	async listMonthlyMeetingCoverage(userId: string) {
		const [user, meetings] = await Promise.all([
			prisma.user.findUnique({
				where: { id: userId },
				select: { createdAt: true },
			}),
			prisma.meeting.findMany({
				where: { closedAt: { not: null } },
				select: {
					date: true,
					closedAt: true,
					attendees: {
						where: { userId },
						select: { presentAt: true },
					},
				},
			}),
		]);

		return {
			memberSince: user?.createdAt ?? null,
			meetings: meetings.map((meeting) => ({
				date: meeting.date,
				closedAt: meeting.closedAt,
				present: meeting.attendees.some(
					(attendee) => attendee.presentAt !== null,
				),
			})),
		};
	},

	listEarnedBadges(userId: string) {
		return prisma.userBadge.findMany({
			where: { userId },
			select: { code: true, earnedAt: true },
		});
	},

	stampBadges(userId: string, badges: { code: string; earnedAt: Date }[]) {
		return prisma.userBadge.createMany({
			data: badges.map((badge) => ({
				userId,
				code: badge.code,
				earnedAt: badge.earnedAt,
			})),
			skipDuplicates: true,
		});
	},
};

export type ProfileRepository = typeof profileRepository;
