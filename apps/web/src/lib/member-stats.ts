import { type Activity, MOCK_ACTIVITY } from "@/mocks/activity";
import { type Achievement, MOCK_ACHIEVEMENTS } from "@/mocks/badges";
import {
	CATEGORY_BY_ID,
	KPI_BY_ID,
	KPI_CATEGORIES,
	type Kpi,
	type KpiCategory,
	type KpiCategoryId,
} from "@/mocks/kpis";
import { MOCK_MEMBERS } from "@/mocks/members";

export type LevelProgress = {
	level: number;
	current: number;
	needed: number;
	remaining: number;
	percent: number;
};

export function levelProgress(points: number): LevelProgress {
	let level = 0;
	let base = 0;
	let step = 100;

	while (base + step <= points) {
		level += 1;
		base += step;
		step += 50;
	}

	const current = points - base;

	return {
		level,
		current,
		needed: step,
		remaining: step - current,
		percent: (current / step) * 100,
	};
}

export function levelOf(points: number) {
	return levelProgress(points).level;
}

export const TEAM_SIZE = MOCK_MEMBERS.length;

const RANK_BY_ID = new Map(
	MOCK_MEMBERS.map((member, index) => [member.id, index + 1]),
);

export function rankOf(memberId: string) {
	return RANK_BY_ID.get(memberId) ?? TEAM_SIZE;
}

export type HistoryEntry = {
	activity: Activity;
	kpi: Kpi;
	category: KpiCategory;
};

const HISTORY_BY_MEMBER = new Map<string, HistoryEntry[]>();

for (const activity of MOCK_ACTIVITY) {
	const kpi = KPI_BY_ID.get(activity.kpiId);
	const category = kpi && CATEGORY_BY_ID.get(kpi.category);
	if (!kpi || !category) continue;

	const entries = HISTORY_BY_MEMBER.get(activity.memberId);
	const entry = { activity, kpi, category };

	if (entries) {
		entries.push(entry);
	} else {
		HISTORY_BY_MEMBER.set(activity.memberId, [entry]);
	}
}

const NO_HISTORY: HistoryEntry[] = [];

export function historyOf(memberId: string) {
	return HISTORY_BY_MEMBER.get(memberId) ?? NO_HISTORY;
}

export type CategoryShare = {
	category: KpiCategory;
	points: number;
	percent: number;
};

export function pointsByCategory(memberId: string): CategoryShare[] {
	const totals = new Map<KpiCategoryId, number>();
	let total = 0;

	for (const { kpi } of historyOf(memberId)) {
		totals.set(kpi.category, (totals.get(kpi.category) ?? 0) + kpi.points);
		total += kpi.points;
	}

	return KPI_CATEGORIES.map((category) => {
		const points = totals.get(category.id) ?? 0;
		return {
			category,
			points,
			percent: total === 0 ? 0 : (points / total) * 100,
		};
	});
}

export type MemberAchievements = {
	earned: Achievement[];
	locked: Achievement[];
	total: number;
};

export function achievementsOf(memberId: string): MemberAchievements {
	const earned: Achievement[] = [];
	const locked: Achievement[] = [];

	for (const achievement of MOCK_ACHIEVEMENTS) {
		if (achievement.earnedBy.includes(memberId)) {
			earned.push(achievement);
		} else {
			locked.push(achievement);
		}
	}

	return { earned, locked, total: MOCK_ACHIEVEMENTS.length };
}
