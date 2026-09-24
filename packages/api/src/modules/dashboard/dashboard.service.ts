import { levelFor } from "../../shared/gamification";
import { rank, windowOf } from "../../shared/ranking";
import { MemberInactiveError, MemberNotFoundError } from "./dashboard.errors";
import {
	mapDashboardMember,
	mapRecentAssignment,
	mapRecentKpi,
	toRankableRow,
} from "./dashboard.mapper";
import { dashboardRepository } from "./dashboard.repository";

const RECENT_KPIS = 5;
const RANKING_TOP = 5;
const RECENT_ASSIGNMENTS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

const WITHOUT_KPIS_DAYS = 30;

export const dashboardService = {
	async getMemberDashboard(userId: string) {
		const user = await dashboardRepository.findUserById(userId);

		if (!user) {
			throw new MemberNotFoundError();
		}

		if (!user.active) {
			throw new MemberInactiveError();
		}

		const [team, recent] = await Promise.all([
			dashboardRepository.aggregateTeam(null),
			dashboardRepository.listRecentValidAssignments(userId, RECENT_KPIS),
		]);

		const ranked = rank(team.map(toRankableRow));
		const me = ranked.find((row) => row.userId === userId);

		if (!me) {
			throw new MemberInactiveError();
		}

		return {
			user: mapDashboardMember(user),
			points: me.points,
			kpiCount: me.kpiCount,
			rankingPosition: me.position,
			teamSize: ranked.length,
			level: levelFor(me.points),
			recentKpis: recent.map(mapRecentKpi),
		};
	},

	async getAdminDashboard(now = new Date()) {
		const week = windowOf("week", now);
		const month = windowOf("month", now);

		const [
			members,
			weekTotals,
			monthTotals,
			weekMeetings,
			monthMeetings,
			openMeetings,
			monthTeam,
			recentAssignments,
			activeMembers,
		] = await Promise.all([
			dashboardRepository.countMembers(),
			dashboardRepository.assignmentTotals(week),
			dashboardRepository.assignmentTotals(month),
			dashboardRepository.countMeetingsInWindow(week),
			dashboardRepository.countMeetingsInWindow(month),
			dashboardRepository.countOpenMeetings(),
			dashboardRepository.aggregateTeam(month),
			dashboardRepository.listRecentAssignments(RECENT_ASSIGNMENTS),
			dashboardRepository.listActiveMembersWithLastValidAssignment(),
		]);

		const memberById = new Map(monthTeam.map((member) => [member.id, member]));

		const ranking = rank(monthTeam.map(toRankableRow))
			.slice(0, RANKING_TOP)
			.map((row) => {
				const member = memberById.get(row.userId);

				if (!member) {
					throw new Error(`Ranking row ${row.userId} has no member`);
				}

				return {
					position: row.position,
					member: mapDashboardMember(member),
					points: row.points,
					kpiCount: row.kpiCount,
				};
			});

		const threshold = now.getTime() - WITHOUT_KPIS_DAYS * DAY_MS;

		const membersWithoutKpis = activeMembers
			.map((member) => {
				const lastAssignmentAt = member.assignedKpis[0]?.assignedAt ?? null;
				const reference = lastAssignmentAt ?? member.createdAt;

				return {
					id: member.id,
					name: member.name,
					position: member.position,
					lastAssignmentAt,
					reference,
					daysWithout: Math.floor(
						(now.getTime() - reference.getTime()) / DAY_MS,
					),
				};
			})
			.filter((member) => member.reference.getTime() <= threshold)
			.sort((a, b) => b.daysWithout - a.daysWithout)
			.map(({ reference: _reference, ...member }) => member);

		return {
			members,
			kpis: { week: weekTotals.count, month: monthTotals.count },
			meetings: {
				week: weekMeetings,
				month: monthMeetings,
				open: openMeetings,
			},
			points: { week: weekTotals.points, month: monthTotals.points },
			ranking,
			recentAssignments: recentAssignments.map(mapRecentAssignment),
			membersWithoutKpis,
		};
	},
};

export type DashboardService = typeof dashboardService;
