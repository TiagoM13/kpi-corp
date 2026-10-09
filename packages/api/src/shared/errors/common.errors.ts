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

export class AccountDeactivatedError extends DomainError {
	readonly code = "ACCOUNT_DEACTIVATED";
	readonly status = "FORBIDDEN" as const;

	constructor() {
		super("Account is deactivated");
	}
}
