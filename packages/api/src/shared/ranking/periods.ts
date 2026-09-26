import { addDays, dayEnd, dayOf, dayStart } from "../time";

// Janelas recortadas do calendário de São Paulo. `end` é exclusivo — a
// comparação contra assignedAt é sempre `>= start E < end`.
export type RankingWindow = {
	start: Date;
	end: Date;
	startDay: string;
	endDay: string;
};

export type CalendarPeriod = "week" | "month" | "quarter";

function isoWeekMonday(day: string): string {
	const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay();

	return addDays(day, -((weekday + 6) % 7));
}

function monthStartDay(day: string): string {
	return `${day.slice(0, 7)}-01`;
}

function quarterStartDay(day: string): string {
	const month = Number(day.slice(5, 7));
	const firstMonth = 3 * Math.floor((month - 1) / 3) + 1;

	return `${day.slice(0, 4)}-${String(firstMonth).padStart(2, "0")}-01`;
}

function nextStartDay(period: CalendarPeriod, startDay: string): string {
	if (period === "week") {
		return addDays(startDay, 7);
	}

	const date = new Date(`${startDay}T00:00:00.000Z`);
	date.setUTCMonth(date.getUTCMonth() + (period === "month" ? 1 : 3), 1);

	return date.toISOString().slice(0, 10);
}

function startDayOf(period: CalendarPeriod, day: string): string {
	if (period === "week") {
		return isoWeekMonday(day);
	}

	if (period === "month") {
		return monthStartDay(day);
	}

	return quarterStartDay(day);
}

function windowFromStartDay(period: CalendarPeriod, startDay: string) {
	const endDay = addDays(nextStartDay(period, startDay), -1);

	return {
		start: dayStart(startDay),
		end: dayEnd(endDay),
		startDay,
		endDay,
	};
}

export function windowOf(period: CalendarPeriod, at: Date): RankingWindow {
	if (period !== "week" && period !== "month" && period !== "quarter") {
		throw new Error(`Unknown calendar period: ${period}`);
	}

	return windowFromStartDay(period, startDayOf(period, dayOf(at)));
}

export function previousWindow(
	period: CalendarPeriod,
	window: RankingWindow,
): RankingWindow {
	// Um milissegundo antes do início cai no fim da janela anterior.
	return windowOf(period, new Date(window.start.getTime() - 1));
}

export function previousElapsedWindow(
	period: CalendarPeriod,
	now: Date,
): Pick<RankingWindow, "start" | "end"> {
	const current = windowOf(period, now);
	const previous = previousWindow(period, current);
	const elapsed = now.getTime() - current.start.getTime();

	return {
		start: previous.start,
		end: new Date(
			Math.min(previous.start.getTime() + elapsed, previous.end.getTime()),
		),
	};
}
