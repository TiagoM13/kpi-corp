import { DomainError } from "../../shared/errors/domain-error";

export class InvalidCredentialsError extends DomainError {
	readonly code = "INVALID_CREDENTIALS";
	readonly status = "UNAUTHORIZED" as const;

	constructor() {
		super("Invalid email or password");
	}
}

export class AccountDeactivatedError extends DomainError {
	readonly code = "ACCOUNT_DEACTIVATED";
	readonly status = "FORBIDDEN" as const;

	constructor() {
		super("Account is deactivated");
	}
}

export class InvalidRefreshTokenError extends DomainError {
	readonly code = "INVALID_REFRESH_TOKEN";
	readonly status = "UNAUTHORIZED" as const;

	constructor() {
		super("Invalid or expired refresh token");
	}
}

export class InvalidInvitationError extends DomainError {
	readonly code = "INVALID_INVITATION";
	readonly status = "UNAUTHORIZED" as const;

	constructor() {
		super("Invalid invitation token");
	}
}

export class InvitationAlreadyUsedError extends DomainError {
	readonly code = "INVITATION_ALREADY_USED";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("Invitation already used");
	}
}

export class InvitationExpiredError extends DomainError {
	readonly code = "INVITATION_EXPIRED";
	readonly status = "UNAUTHORIZED" as const;

	constructor() {
		super("Invitation expired");
	}
}

export class EmailAlreadyRegisteredError extends DomainError {
	readonly code = "EMAIL_ALREADY_REGISTERED";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("Email already registered");
	}
}

export class UnauthorizedError extends DomainError {
	readonly code = "UNAUTHORIZED";
	readonly status = "UNAUTHORIZED" as const;

	constructor() {
		super("Unauthorized");
	}
}

export class ForbiddenError extends DomainError {
	readonly code = "FORBIDDEN";
	readonly status = "FORBIDDEN" as const;

	constructor() {
		super("Forbidden");
	}
}
