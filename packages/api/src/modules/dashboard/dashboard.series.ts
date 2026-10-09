import { isoWeekMonday, monthStartDay } from "../../shared/ranking";
import { addDays, dayOf } from "../../shared/time";

export type SeriesPeriod = "7d" | "30d" | "90d" | "all";

export type DailyTotal = { day: string; points: number; kpiCount: number };

export type SeriesBucket = { start: string; points: number; kpiCount: number };

type Unit = "day" | "week" | "month";

const UNIT_BY_PERIOD: Record<SeriesPeriod, Unit> = {
	"7d": "day",
	"30d": "day",
	"90d": "week",
	all: "month",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS_IN_QUARTER_SERIES = 12;
const TREND_WEEKS = 8;
const TREND_DAYS = 7;

function startOf(unit: Unit, day: string): string {
	if (unit === "week") {
		return isoWeekMonday(day);
	}

	return unit === "month" ? monthStartDay(day) : day;
}

function nextStart(unit: Unit, start: string): string {
	if (unit === "day") {
		return addDays(start, 1);
	}

	if (unit === "week") {
		return addDays(start, 7);
	}

	const date = new Date(`${start}T00:00:00.000Z`);
	date.setUTCMonth(date.getUTCMonth() + 1, 1);

	return date.toISOString().slice(0, 10);
}

function bucketize(
	rows: DailyTotal[],
	unit: Unit,
	firstDay: string,
	lastDay: string,
): SeriesBucket[] {
	const buckets = new Map<string, SeriesBucket>();
	const last = startOf(unit, lastDay);

	for (
		let start = startOf(unit, firstDay);
		start <= last;
		start = nextStart(unit, start)
	) {
		buckets.set(start, { start, points: 0, kpiCount: 0 });
	}

	for (const row of rows) {
		const bucket = buckets.get(startOf(unit, row.day));

		if (bucket) {
			bucket.points += row.points;
			bucket.kpiCount += row.kpiCount;
		}
	}

	return [...buckets.values()];
}

export function seriesFirstDay(
	period: SeriesPeriod,
	today: string,
): string | null {
	if (period === "7d") {
		return addDays(today, -6);
	}

	if (period === "30d") {
		return addDays(today, -29);
	}

	if (period === "90d") {
		return addDays(isoWeekMonday(today), -7 * (WEEKS_IN_QUARTER_SERIES - 1));
	}

	return null;
}

export function buildSeries(
	period: SeriesPeriod,
	rows: DailyTotal[],
	today: string,
): SeriesBucket[] {
	const earliest = rows.reduce<string | null>(
		(min, row) => (min === null || row.day < min ? row.day : min),
		null,
	);
	const firstDay = seriesFirstDay(period, today) ?? earliest ?? today;

	return bucketize(rows, UNIT_BY_PERIOD[period], firstDay, today);
}

export function trendsFirstDay(today: string): string {
	return addDays(isoWeekMonday(today), -7 * (TREND_WEEKS - 1));
}

export function buildTrends(rows: DailyTotal[], today: string) {
	return {
		points: bucketize(rows, "week", trendsFirstDay(today), today).map(
			(bucket) => bucket.points,
		),
		kpis: bucketize(rows, "day", addDays(today, -(TREND_DAYS - 1)), today).map(
			(bucket) => bucket.kpiCount,
		),
	};
}

export function elapsedDays(weekStartDay: string, today: string): number {
	const start = Date.parse(`${weekStartDay}T00:00:00.000Z`);
	const end = Date.parse(`${today}T00:00:00.000Z`);

	return Math.round((end - start) / DAY_MS) + 1;
}

export function dailyPoints(
	rows: { assignedAt: Date; points: number }[],
	firstDay: string,
	lastDay: string,
): number[] {
	const byDay = new Map<string, number>();

	for (const row of rows) {
		const day = dayOf(row.assignedAt);
		byDay.set(day, (byDay.get(day) ?? 0) + row.points);
	}

	const series: number[] = [];

	for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
		series.push(byDay.get(day) ?? 0);
	}

	return series;
}
