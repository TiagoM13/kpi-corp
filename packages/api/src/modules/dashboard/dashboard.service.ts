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
	previousWindow,
	type RankingWindow,
	rank,
	toRankableRow,
	windowOf,
} from "../../shared/ranking";
import { dayEnd, dayOf, dayStart } from "../../shared/time";
import { mapDashboardMember } from "./dashboard.mapper";
import { dashboardRepository } from "./dashboard.repository";
import {
	buildSeries,
	buildTrends,
	dailyPoints,
	elapsedDays,
	type SeriesPeriod,
	seriesFirstDay,
	trendsFirstDay,
} from "./dashboard.series";

const RANKING_TOP = 5;
const MOVERS_TOP = 5;
const RECENT_ASSIGNMENTS = 10;

function percentChange(current: number, previous: number): number | null {
	if (previous <= 0) {
		return null;
	}

	return Math.round(((current - previous) / previous) * 100);
}

function positionChange(
	before: Parameters<typeof toRankableRow>[0][],
	userId: string,
	currentPosition: number,
): number | null {
	const rows = before.map(toRankableRow);
	const mine = rows.find((row) => row.userId === userId);

	if (!mine || mine.kpiCount === 0) {
		return null;
	}

	const previous = rank(rows).find((row) => row.userId === userId);

	return previous ? previous.position - currentPosition : null;
}

type TeamRow = Parameters<typeof toRankableRow>[0];

async function buildMovers(
	weekTeam: (TeamRow & {
		position: string | null;
		role: "ADMIN" | "MEMBER";
	})[],
	previousTeam: TeamRow[],
	week: RankingWindow,
	today: string,
) {
	const top = rank(weekTeam.map(toRankableRow))
		.filter((row) => row.points > 0)
		.slice(0, MOVERS_TOP);

	if (top.length === 0) {
		return [];
	}

	const memberById = new Map(weekTeam.map((member) => [member.id, member]));
	const previousHasData = previousTeam.some(
		(member) => member.assignedKpis.length > 0,
	);
	const previousPosition = new Map(
		rank(previousTeam.map(toRankableRow)).map((row) => [
			row.userId,
			row.position,
		]),
	);
	const rows = await dashboardRepository.listPointsByUserInWindow(
		top.map((row) => row.userId),
		week,
	);
	const lastDay = elapsedDays(week.startDay, today);

	return top.map((row) => {
		const member = memberById.get(row.userId);

		if (!member) {
			throw new Error(`Mover ${row.userId} has no member`);
		}

		const before = previousPosition.get(row.userId);

		return {
			position: row.position,
			member: mapDashboardMember(member),
			points: row.points,
			kpiCount: row.kpiCount,
			change:
				previousHasData && before !== undefined ? before - row.position : null,
			series: dailyPoints(
				rows.filter((item) => item.userId === row.userId),
				week.startDay,
				today,
			).slice(0, lastDay),
		};
	});
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

		const week = windowOf("week", now);
		const [team, weekRows, teamBeforeWeek] = await Promise.all([
			dashboardRepository.aggregateTeam(null),
			dashboardRepository.listPointsInWindow(userId, week),
			dashboardRepository.aggregateTeam({
				start: new Date(0),
				end: week.start,
			}),
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
			weekPoints: weekRows.reduce((sum, row) => sum + row.points, 0),
			weekSeries: dailyPoints(weekRows, week.startDay, dayOf(now)),
			rankingChange: positionChange(teamBeforeWeek, userId, me.position),
		};
	},

	async getAdminDashboard(now = new Date()) {
		const week = windowOf("week", now);
		const month = windowOf("month", now);
		const previousWeek = previousElapsedWindow("week", now);
		const previousMonth = previousElapsedWindow("month", now);
		const today = dayOf(now);

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
			weekTeam,
			previousWeekTeam,
			trendRows,
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
			dashboardRepository.aggregateTeam(week),
			dashboardRepository.aggregateTeam(previousWindow("week", week)),
			dashboardRepository.dailyTotals({
				start: dayStart(trendsFirstDay(today)),
				end: dayEnd(today),
			}),
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
			trends: buildTrends(trendRows, today),
			movers: await buildMovers(weekTeam, previousWeekTeam, week, today),
			ranking,
			recentAssignments: recentAssignments.map(mapAssignmentHistoryItem),
			membersWithoutKpis,
		};
	},

	async getPointsSeries(period: SeriesPeriod, now = new Date()) {
		const today = dayOf(now);
		const firstDay = seriesFirstDay(period, today);
		const rows = await dashboardRepository.dailyTotals({
			start: firstDay ? dayStart(firstDay) : null,
			end: dayEnd(today),
		});

		return { period, buckets: buildSeries(period, rows, today) };
	},
};

export type DashboardService = typeof dashboardService;
