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

export function mapMeetingDetail(
	meeting: MeetingDetailForMapping,
	creator: MeetingCreator,
): MeetingDetail {
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
		})),
		assignments: meeting.assignments.map(mapKpiAssignment),
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
