import { DomainError } from "../../shared/errors/domain-error";

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

export class AssignmentNotFoundError extends DomainError {
	readonly code = "ASSIGNMENT_NOT_FOUND";
	readonly status = "NOT_FOUND" as const;

	constructor() {
		super("Assignment not found");
	}
}

export class AssignmentAlreadyRevokedError extends DomainError {
	readonly code = "ASSIGNMENT_ALREADY_REVOKED";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("Assignment has already been revoked");
	}
}
