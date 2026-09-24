import { DomainError } from "../../shared/errors/domain-error";

export class PeriodNotAllowedError extends DomainError {
	readonly code = "PERIOD_NOT_ALLOWED";
	readonly status = "FORBIDDEN" as const;

	constructor() {
		super("The quarter period is available to admins only");
	}
}
