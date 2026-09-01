import { DomainError } from "../../shared/errors/domain-error";

export class MemberNotFoundError extends DomainError {
	readonly code = "MEMBER_NOT_FOUND";
	readonly status = "NOT_FOUND" as const;

	constructor() {
		super("Member not found");
	}
}

export class CannotDeactivateSelfError extends DomainError {
	readonly code = "CANNOT_DEACTIVATE_SELF";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("You cannot deactivate your own account");
	}
}

export class LastAdminCannotBeDeactivatedError extends DomainError {
	readonly code = "LAST_ADMIN_CANNOT_BE_DEACTIVATED";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("The last active admin cannot be deactivated");
	}
}
