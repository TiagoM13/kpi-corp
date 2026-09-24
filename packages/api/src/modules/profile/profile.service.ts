import { levelFor } from "../../shared/gamification";
import {
	type BadgeContractEntry,
	buildBadgeResponse,
	evaluateBadges,
	podiumMonths,
} from "./profile.badges";
import { MemberNotFoundError } from "./profile.errors";
import { mapMemberBase, mapMyKpi } from "./profile.mapper";
import {
	type MyAssignmentsFilter,
	profileRepository,
	type ScoredAssignmentRow,
} from "./profile.repository";

export type CategoryScoreKey =
	| "presence"
	| "performance"
	| "behavior"
	| "initiative";

export const CATEGORY_SCORE_KEYS: CategoryScoreKey[] = [
	"presence",
	"performance",
	"behavior",
	"initiative",
];

const CATEGORY_KEY_BY_ENUM: Record<
	ScoredAssignmentRow["kpi"]["category"],
	CategoryScoreKey
> = {
	PRESENCE: "presence",
	PERFORMANCE: "performance",
	BEHAVIOR: "behavior",
	INITIATIVE: "initiative",
};

export function emptyCategoryScores(): Record<CategoryScoreKey, number> {
	return { presence: 0, performance: 0, behavior: 0, initiative: 0 };
}

function addScores(
	target: Record<CategoryScoreKey, number>,
	rows: Pick<ScoredAssignmentRow, "points" | "kpi">[],
) {
	for (const row of rows) {
		target[CATEGORY_KEY_BY_ENUM[row.kpi.category]] += row.points;
	}

	return target;
}

export const profileService = {
	async getMyScore(userId: string) {
		const rows = await profileRepository.listScoredAssignments(userId);
		const categories = addScores(emptyCategoryScores(), rows);
		const total = Object.values(categories).reduce(
			(sum, value) => sum + value,
			0,
		);

		return { total, categories, level: levelFor(total) };
	},

	async getMyKpis(userId: string, filter: MyAssignmentsFilter) {
		const assignments = await profileRepository.listAssignments(userId, filter);

		return { items: assignments.map(mapMyKpi) };
	},

	async getMySummary(userId: string) {
		const assignments = await profileRepository.listAssignments(userId, {});
		const valid = assignments.filter((assignment) => !assignment.revokedAt);

		const countByCategory = addScores(
			emptyCategoryScores(),
			assignments.map((assignment) => ({
				points: 1,
				kpi: assignment.kpi,
			})),
		);
		const scoreByCategory = addScores(emptyCategoryScores(), valid);

		const [last] = assignments;

		return {
			totalCount: assignments.length,
			countByCategory,
			scoreByCategory,
			lastAssignment: last ? mapMyKpi(last) : null,
		};
	},

	async getMyBadges(
		userId: string,
		now = new Date(),
	): Promise<BadgeContractEntry[]> {
		const months = podiumMonths(now);
		const first = months[0];
		const last = months[months.length - 1];

		if (!first || !last) {
			throw new Error("PODIUM_STREAK needs at least one month to scan");
		}

		const [
			assignments,
			earnedRows,
			presences,
			team,
			monthlyAssignments,
			coverage,
		] = await Promise.all([
			profileRepository.listValidAssignments(userId),
			profileRepository.listEarnedBadges(userId),
			profileRepository.listPresences(userId),
			profileRepository.listTeamScores(),
			profileRepository.listTeamScoresByMonth({
				start: first.start,
				end: last.end,
			}),
			profileRepository.listMonthlyMeetingCoverage(userId),
		]);

		const evaluations = evaluateBadges(assignments, now, {
			userId,
			memberSince: coverage.memberSince,
			presences,
			team,
			monthlyAssignments,
			meetings: coverage.meetings,
		});
		const newlyEarned = evaluations
			.filter(
				(evaluation) =>
					evaluation.earned &&
					!earnedRows.some((row) => row.code === evaluation.code),
			)
			.map((evaluation) => ({
				code: evaluation.code,
				earnedAt: evaluation.earnedAt ?? now,
			}));

		if (newlyEarned.length > 0) {
			await profileRepository.stampBadges(userId, newlyEarned);
		}

		return buildBadgeResponse(evaluations, earnedRows);
	},

	async getMyProfile(userId: string) {
		const user = await profileRepository.findUserById(userId);

		if (!user) {
			throw new MemberNotFoundError();
		}

		const [{ total, categories, level }, { items: kpis }, badges] =
			await Promise.all([
				profileService.getMyScore(userId),
				profileService.getMyKpis(userId, {}),
				profileService.getMyBadges(userId),
			]);

		return {
			member: {
				...mapMemberBase(user),
				email: user.email,
				active: user.active,
				createdAt: user.createdAt,
			},
			total,
			categories,
			level,
			kpis,
			badges,
		};
	},

	async getPublicProfile(userId: string) {
		const user = await profileRepository.findActivePublicUserById(userId);

		if (!user) {
			throw new MemberNotFoundError();
		}

		const [{ total, categories, level }, { items: kpis }, badges] =
			await Promise.all([
				profileService.getMyScore(userId),
				profileService.getMyKpis(userId, { revoked: false }),
				profileService.getMyBadges(userId),
			]);

		return {
			member: mapMemberBase(user),
			total,
			categories,
			level,
			kpis,
			badges,
		};
	},
};

export type ProfileService = typeof profileService;
