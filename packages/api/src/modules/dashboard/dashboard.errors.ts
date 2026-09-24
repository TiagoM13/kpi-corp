import { DomainError } from "../../shared/errors/domain-error";

export class MemberInactiveError extends DomainError {
	readonly code = "MEMBER_INACTIVE";
	readonly status = "FORBIDDEN" as const;

	constructor() {
		super("Inactive members have no dashboard");
	}
}

export class MemberNotFoundError extends DomainError {
	readonly code = "MEMBER_NOT_FOUND";
	readonly status = "NOT_FOUND" as const;

	constructor() {
		super("Member not found");
	}
}
