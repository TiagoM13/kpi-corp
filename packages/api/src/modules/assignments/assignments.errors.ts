import { DomainError } from "../../shared/errors/domain-error";

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
