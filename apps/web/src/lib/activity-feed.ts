import { type Activity, MOCK_ACTIVITY } from "@/mocks/activity";
import {
	CATEGORY_BY_ID,
	KPI_BY_ID,
	type Kpi,
	type KpiCategory,
} from "@/mocks/kpis";
import { MEMBER_BY_ID, type Member } from "@/mocks/members";

export type ActivityEntry = {
	activity: Activity;
	kpi: Kpi;
	category: KpiCategory;
	member: Member;
};

const FEED: ActivityEntry[] = [];
const BY_MEMBER = new Map<string, ActivityEntry[]>();

for (const activity of MOCK_ACTIVITY) {
	const kpi = KPI_BY_ID.get(activity.kpiId);
	const category = kpi && CATEGORY_BY_ID.get(kpi.category);
	const member = MEMBER_BY_ID.get(activity.memberId);
	if (!kpi || !category || !member) continue;

	const entry: ActivityEntry = { activity, kpi, category, member };
	FEED.push(entry);

	const owned = BY_MEMBER.get(activity.memberId);
	if (owned) {
		owned.push(entry);
	} else {
		BY_MEMBER.set(activity.memberId, [entry]);
	}
}

const NO_ACTIVITY: ActivityEntry[] = [];

export function recentActivity(limit = FEED.length) {
	return FEED.slice(0, limit);
}

export function activityOf(memberId: string) {
	return BY_MEMBER.get(memberId) ?? NO_ACTIVITY;
}
