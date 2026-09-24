import { DomainError } from "../../shared/errors/domain-error";

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
