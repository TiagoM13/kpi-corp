import { DomainError } from "./domain-error";

export class UnauthorizedError extends DomainError {
	readonly code = "UNAUTHORIZED";
	readonly status = "UNAUTHORIZED" as const;

	constructor() {
		super("Unauthorized");
	}
}

export class EmailAlreadyRegisteredError extends DomainError {
	readonly code = "EMAIL_ALREADY_REGISTERED";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("Email already registered");
	}
}
