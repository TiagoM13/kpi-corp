export type DomainErrorStatus =
	| "BAD_REQUEST"
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "CONFLICT"
	| "UNPROCESSABLE_CONTENT"
	| "TOO_MANY_REQUESTS"
	| "INTERNAL_SERVER_ERROR";

export abstract class DomainError extends Error {
	abstract readonly code: string;
	abstract readonly status: DomainErrorStatus;

	constructor(message: string) {
		super(message);
		this.name = new.target.name;
	}
}
