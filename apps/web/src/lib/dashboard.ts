import type { AppRouterClient } from "@kpi-corp/api/routers/index";

import { MOCK_MEMBERS } from "@/mocks/members";
import { TEAM_STATS } from "@/mocks/team-history";

export type AdminDashboard = Awaited<
	ReturnType<AppRouterClient["dashboard"]["getAdmin"]>
>;

export type DashboardAssignment = AdminDashboard["recentAssignments"][number];
export type DashboardRankingEntry = AdminDashboard["ranking"][number];
export type MemberWithoutKpis = AdminDashboard["membersWithoutKpis"][number];

export const STAGNANT_THRESHOLD_DAYS = 7;

export type TeamTotals = {
	points: number;
	activeMembers: number;
	totalMembers: number;
	stagnantCount: number;
	weekKpis: number;
	weekMeetings: number;
};

export function stagnantMembers() {
	return MOCK_MEMBERS.filter(
		(member) => (member.stagnantDays ?? 0) >= STAGNANT_THRESHOLD_DAYS,
	).sort((a, b) => (b.stagnantDays ?? 0) - (a.stagnantDays ?? 0));
}

export function teamTotals(): TeamTotals {
	let points = 0;
	for (const member of MOCK_MEMBERS) {
		points += member.points;
	}

	return {
		points,
		activeMembers: MOCK_MEMBERS.length,
		totalMembers: MOCK_MEMBERS.length,
		stagnantCount: stagnantMembers().length,
		weekKpis: TEAM_STATS.weekKpis,
		weekMeetings: TEAM_STATS.weekMeetings,
	};
}

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
