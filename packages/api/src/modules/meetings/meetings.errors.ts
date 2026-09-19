import { DomainError } from "../../shared/errors/domain-error";

export class MeetingNotFoundError extends DomainError {
	readonly code = "MEETING_NOT_FOUND";
	readonly status = "NOT_FOUND" as const;

	constructor() {
		super("Meeting not found");
	}
}

export class MeetingClosedError extends DomainError {
	readonly code = "MEETING_CLOSED";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("Closed meetings are immutable");
	}
}

export class MeetingAlreadyClosedError extends DomainError {
	readonly code = "MEETING_ALREADY_CLOSED";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("Meeting has already been closed");
	}
}

export class KpiNotFoundError extends DomainError {
	readonly code = "KPI_NOT_FOUND";
	readonly status = "NOT_FOUND" as const;

	constructor() {
		super("KPI not found");
	}
}

export class KpiInactiveError extends DomainError {
	readonly code = "KPI_INACTIVE";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("Inactive KPIs cannot receive new assignments");
	}
}

export class KpiNotPresenceError extends DomainError {
	readonly code = "KPI_NOT_PRESENCE";
	readonly status = "UNPROCESSABLE_CONTENT" as const;

	constructor() {
		super("Attendance requires a KPI of category PRESENCE");
	}
}

export class MemberNotFoundError extends DomainError {
	readonly code = "MEMBER_NOT_FOUND";
	readonly status = "NOT_FOUND" as const;

	constructor() {
		super("Member not found");
	}
}

export class MemberInactiveError extends DomainError {
	readonly code = "MEMBER_INACTIVE";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("Inactive members cannot receive new assignments");
	}
}

export class AttendeeNotPresentError extends DomainError {
	readonly code = "ATTENDEE_NOT_PRESENT";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("Only attendees present at the meeting can receive a meeting KPI");
	}
}
