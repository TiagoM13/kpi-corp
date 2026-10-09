import type { AppRouterClient } from "@kpi-corp/api/routers/index";

export type AdminDashboard = Awaited<
	ReturnType<AppRouterClient["dashboard"]["getAdmin"]>
>;

export type DashboardAssignment = AdminDashboard["recentAssignments"][number];
export type DashboardRankingEntry = AdminDashboard["ranking"][number];
export type MemberWithoutKpis = AdminDashboard["membersWithoutKpis"][number];
export type DashboardMover = AdminDashboard["movers"][number];

export type PointsSeries = Awaited<
	ReturnType<AppRouterClient["dashboard"]["getPointsSeries"]>
>;
export type SeriesPeriod = PointsSeries["period"];

export type Greeting = "Bom dia" | "Boa tarde" | "Boa noite";

export function greetingFor(date: Date): Greeting {
	const hour = date.getHours();
	if (hour < 12) return "Bom dia";
	if (hour < 18) return "Boa tarde";
	return "Boa noite";
}

export function firstNameOf(name: string) {
	return name.trim().split(/\s+/)[0] ?? name;
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
});

export function formatToday(date: Date) {
	return dateFormat.format(date);
}

const relativeFormat = new Intl.RelativeTimeFormat("pt-BR", {
	numeric: "auto",
});

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
	["minute", 60],
	["hour", 24],
	["day", 7],
	["week", 4.35],
	["month", 12],
];

export function formatRelative(date: Date, now = new Date()) {
	let value = (date.getTime() - now.getTime()) / 60_000;

	for (const [unit, size] of RELATIVE_STEPS) {
		if (Math.abs(value) < size) {
			return relativeFormat.format(Math.round(value), unit);
		}
		value /= size;
	}

	return relativeFormat.format(Math.round(value), "year");
}

const tickDayFormat = new Intl.DateTimeFormat("pt-BR", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
});
const tickMonthFormat = new Intl.DateTimeFormat("pt-BR", {
	month: "short",
	timeZone: "UTC",
});

function stripDot(text: string) {
	return text.replace(".", "");
}

export function seriesTickLabel(
	period: SeriesPeriod,
	start: string,
	lastStart: string,
) {
	const date = new Date(`${start}T00:00:00.000Z`);

	if (period !== "all") {
		return stripDot(tickDayFormat.format(date)).replace(" de ", " ");
	}

	const month = stripDot(tickMonthFormat.format(date));
	const sameYear = start.slice(0, 4) === lastStart.slice(0, 4);

	return sameYear ? month : `${month} ${start.slice(2, 4)}`;
}
