import { type Achievement, MOCK_ACHIEVEMENTS } from "@/mocks/badges";
import {
	KPI_CATEGORIES,
	type KpiCategory,
	type KpiCategoryId,
} from "@/mocks/kpis";
import { type ActivityEntry, activityOf } from "./activity-feed";
import { overallPositionOf } from "./ranking";

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

export function rankOf(memberId: string) {
	return overallPositionOf(memberId);
}

export type HistoryEntry = ActivityEntry;

export function historyOf(memberId: string) {
	return activityOf(memberId);
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
