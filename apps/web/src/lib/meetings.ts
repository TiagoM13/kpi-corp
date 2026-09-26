import type { AppRouterClient } from "@kpi-corp/api/routers/index";

import { domainCodeOf } from "@/lib/auth";

type MeetingsClient = AppRouterClient["meetings"];

export type MeetingDetail = Awaited<ReturnType<MeetingsClient["getById"]>>;
export type MeetingAttendee = MeetingDetail["attendees"][number];
export type MeetingAssignment = MeetingDetail["assignments"][number];
export type OpenMeeting = Awaited<
	ReturnType<MeetingsClient["list"]>
>["items"][number];

export type MeetingPerson = {
	id: string;
	name: string;
	position: string | null;
};

export function calendarDateOf(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function presentAttendees(meeting: MeetingDetail): MeetingPerson[] {
	return meeting.attendees
		.filter((attendee) => attendee.presentAt !== null)
		.map((attendee) => ({
			id: attendee.userId,
			name: attendee.name,
			position: attendee.position,
		}));
}

export function activeAssignments(meeting: MeetingDetail) {
	return meeting.assignments.filter(
		(assignment) => assignment.revokedAt === null,
	);
}

export function lastActiveAssignment(meeting: MeetingDetail) {
	return activeAssignments(meeting).reduce<MeetingAssignment | null>(
		(latest, assignment) =>
			latest === null || assignment.assignedAt > latest.assignedAt
				? assignment
				: latest,
		null,
	);
}

const MEETING_ERROR_BY_CODE: Record<string, string> = {
	MEETING_CLOSED: "Esta reunião já foi encerrada.",
	MEETING_ALREADY_CLOSED: "Esta reunião já foi encerrada.",
	MEETING_NOT_FOUND: "Esta reunião não existe mais.",
	KPI_NOT_PRESENCE: "Escolha um KPI da categoria Presença.",
	KPI_INACTIVE: "Este KPI foi inativado. Escolha outro.",
	KPI_NOT_FOUND: "Este KPI não existe mais. Escolha outro.",
	ATTENDEE_NOT_PRESENT: "Marque a presença antes de reconhecer.",
	MEMBER_INACTIVE: "Um dos membros foi desativado.",
	MEMBER_NOT_FOUND: "Um dos membros não existe mais.",
	ASSIGNMENT_ALREADY_REVOKED: "Essa atribuição já tinha sido desfeita.",
};

export function meetingErrorOf(error: unknown, fallback: string) {
	return MEETING_ERROR_BY_CODE[domainCodeOf(error) ?? ""] ?? fallback;
}

export function formatDuration(from: Date, to: Date) {
	const seconds = Math.max(
		0,
		Math.floor((to.getTime() - from.getTime()) / 1000),
	);
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const rest = seconds % 60;
	const mmss = `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
	return hours > 0 ? `${hours}:${mmss}` : mmss;
}
