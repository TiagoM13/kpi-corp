import { DomainError } from "../../shared/errors/domain-error";

export class KpiNotFoundError extends DomainError {
	readonly code = "KPI_NOT_FOUND";
	readonly status = "NOT_FOUND" as const;

	constructor() {
		super("KPI not found");
	}
}

export class KpiNameTakenError extends DomainError {
	readonly code = "KPI_NAME_TAKEN";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("A KPI with this name already exists");
	}
}
