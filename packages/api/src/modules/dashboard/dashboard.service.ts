import {
	AccountDeactivatedError,
	MemberNotFoundError,
} from "../../shared/errors/common.errors";
import { levelFor } from "../../shared/gamification";
import { mapAssignmentHistoryItem } from "../../shared/mappers";
import {
	daysWithoutKpi,
	isStagnant,
	WITHOUT_KPIS_DAYS,
} from "../../shared/members";
import {
	previousElapsedWindow,
	rank,
	toRankableRow,
	windowOf,
} from "../../shared/ranking";
import { mapDashboardMember, mapRecentKpi } from "./dashboard.mapper";
import { dashboardRepository } from "./dashboard.repository";

const RECENT_KPIS = 5;
const RANKING_TOP = 5;
const RECENT_ASSIGNMENTS = 10;

function percentChange(current: number, previous: number): number | null {
	if (previous <= 0) {
		return null;
	}

	return Math.round(((current - previous) / previous) * 100);
}

export const dashboardService = {
	async getMemberDashboard(userId: string, now = new Date()) {
		const user = await dashboardRepository.findUserById(userId);

		if (!user) {
			throw new MemberNotFoundError();
		}

		if (!user.active) {
			throw new AccountDeactivatedError();
		}

		const [team, recent, weekPoints] = await Promise.all([
			dashboardRepository.aggregateTeam(null),
			dashboardRepository.listRecentValidAssignments(userId, RECENT_KPIS),
			dashboardRepository.sumPointsInWindow(userId, windowOf("week", now)),
		]);

		const ranked = rank(team.map(toRankableRow));
		const me = ranked.find((row) => row.userId === userId);

		if (!me) {
			throw new AccountDeactivatedError();
		}

		return {
			user: mapDashboardMember(user),
			points: me.points,
			kpiCount: me.kpiCount,
			rankingPosition: me.position,
			teamSize: ranked.length,
			level: levelFor(me.points),
			weekPoints,
			recentKpis: recent.map(mapRecentKpi),
		};
	},

	async getAdminDashboard(now = new Date()) {
		const week = windowOf("week", now);
		const month = windowOf("month", now);
		const previousWeek = previousElapsedWindow("week", now);
		const previousMonth = previousElapsedWindow("month", now);

		const [
			members,
			weekTotals,
			monthTotals,
			allTimeTotals,
			previousWeekTotals,
			previousMonthTotals,
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
			dashboardRepository.assignmentTotals(null),
			dashboardRepository.assignmentTotals(previousWeek),
			dashboardRepository.assignmentTotals(previousMonth),
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

		const membersWithoutKpis = activeMembers
			.map((member) => {
				const lastAssignmentAt = member.assignedKpis[0]?.assignedAt ?? null;

				return {
					id: member.id,
					name: member.name,
					position: member.position,
					lastAssignmentAt,
					daysWithout: daysWithoutKpi(
						{ lastAssignmentAt, createdAt: member.createdAt },
						now,
					),
				};
			})
			.filter((member) => isStagnant(member.daysWithout))
			.sort((a, b) => b.daysWithout - a.daysWithout);

		return {
			members,
			kpis: {
				week: weekTotals.count,
				month: monthTotals.count,
				weekDelta: percentChange(weekTotals.count, previousWeekTotals.count),
			},
			meetings: {
				week: weekMeetings,
				month: monthMeetings,
				open: openMeetings,
			},
			points: {
				week: weekTotals.points,
				month: monthTotals.points,
				total: allTimeTotals.points,
				monthDelta: percentChange(
					monthTotals.points,
					previousMonthTotals.points,
				),
			},
			withoutKpisDays: WITHOUT_KPIS_DAYS,
			ranking,
			recentAssignments: recentAssignments.map(mapAssignmentHistoryItem),
			membersWithoutKpis,
		};
	},
};

export type DashboardService = typeof dashboardService;
