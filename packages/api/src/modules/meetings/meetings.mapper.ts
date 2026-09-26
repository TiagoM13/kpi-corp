import type {
	Meeting as PrismaMeeting,
	MeetingAttendee as PrismaMeetingAttendee,
	User as PrismaUser,
} from "@kpi-corp/db/prisma/generated/client";

import {
	type KpiAssignment,
	type KpiAssignmentForMapping,
	mapKpiAssignment,
} from "../../shared/mappers";
import { rank } from "../../shared/ranking";

const PODIUM_SIZE = 3;

export type MeetingStatus = "OPEN" | "CLOSED";

export function mapMeetingStatus(
	meeting: Pick<PrismaMeeting, "closedAt">,
): MeetingStatus {
	return meeting.closedAt ? "CLOSED" : "OPEN";
}

export type MeetingCreator = {
	id: string;
	name: string;
};

export type MeetingAttendee = {
	userId: string;
	name: string;
	position: string | null;
	presentAt: Date | null;
	points: number;
};

export type MeetingPodiumEntry = {
	userId: string;
	name: string;
	points: number;
};

export type MeetingSummary = {
	totalPoints: number;
	podium: MeetingPodiumEntry[];
};

export type MeetingDetail = {
	id: string;
	title: string;
	date: Date;
	status: MeetingStatus;
	closedAt: Date | null;
	createdAt: Date;
	createdBy: MeetingCreator;
	attendees: MeetingAttendee[];
	assignments: KpiAssignment[];
	summary: MeetingSummary;
};

export type MeetingDetailForMapping = Pick<
	PrismaMeeting,
	"id" | "title" | "date" | "closedAt" | "createdAt" | "createdBy"
> & {
	attendees: (Pick<PrismaMeetingAttendee, "userId" | "presentAt"> & {
		user: Pick<PrismaUser, "name" | "position">;
	})[];
	assignments: KpiAssignmentForMapping[];
};

type Score = { points: number; kpiCount: number };

function scoreByUser(assignments: KpiAssignmentForMapping[]) {
	const scores = new Map<string, Score>();

	for (const assignment of assignments) {
		if (assignment.revokedAt !== null) {
			continue;
		}

		const score = scores.get(assignment.userId) ?? { points: 0, kpiCount: 0 };

		scores.set(assignment.userId, {
			points: score.points + assignment.points,
			kpiCount: score.kpiCount + 1,
		});
	}

	return scores;
}

export function mapMeetingDetail(
	meeting: MeetingDetailForMapping,
	creator: MeetingCreator,
): MeetingDetail {
	const scores = scoreByUser(meeting.assignments);
	const totalPoints = [...scores.values()].reduce(
		(sum, score) => sum + score.points,
		0,
	);
	const podium = rank(
		meeting.attendees.map((attendee) => ({
			userId: attendee.userId,
			name: attendee.user.name,
			points: scores.get(attendee.userId)?.points ?? 0,
			kpiCount: scores.get(attendee.userId)?.kpiCount ?? 0,
		})),
	)
		.filter((row) => row.points > 0)
		.slice(0, PODIUM_SIZE)
		.map(({ userId, name, points }) => ({ userId, name, points }));

	return {
		id: meeting.id,
		title: meeting.title,
		date: meeting.date,
		status: mapMeetingStatus(meeting),
		closedAt: meeting.closedAt,
		createdAt: meeting.createdAt,
		createdBy: creator,
		attendees: meeting.attendees.map((attendee) => ({
			userId: attendee.userId,
			name: attendee.user.name,
			position: attendee.user.position,
			presentAt: attendee.presentAt,
			points: scores.get(attendee.userId)?.points ?? 0,
		})),
		assignments: meeting.assignments.map(mapKpiAssignment),
		summary: { totalPoints, podium },
	};
}

export type MeetingListItem = {
	id: string;
	title: string;
	date: Date;
	status: MeetingStatus;
	closedAt: Date | null;
	attendeeCount: number;
	presentCount: number;
	assignmentCount: number;
};

export type MeetingListItemForMapping = Pick<
	PrismaMeeting,
	"id" | "title" | "date" | "closedAt"
> & {
	attendees: Pick<PrismaMeetingAttendee, "presentAt">[];
	_count: { assignments: number };
};

export function mapMeetingListItem(
	meeting: MeetingListItemForMapping,
): MeetingListItem {
	return {
		id: meeting.id,
		title: meeting.title,
		date: meeting.date,
		status: mapMeetingStatus(meeting),
		closedAt: meeting.closedAt,
		attendeeCount: meeting.attendees.length,
		presentCount: meeting.attendees.filter(
			(attendee) => attendee.presentAt !== null,
		).length,
		assignmentCount: meeting._count.assignments,
	};
}
