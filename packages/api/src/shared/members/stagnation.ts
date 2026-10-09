export const WITHOUT_KPIS_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysWithoutKpi(
	member: { lastAssignmentAt: Date | null; createdAt: Date },
	now: Date,
): number {
	const reference = member.lastAssignmentAt ?? member.createdAt;

	return Math.floor((now.getTime() - reference.getTime()) / DAY_MS);
}

export function isStagnant(days: number): boolean {
	return days >= WITHOUT_KPIS_DAYS;
}
