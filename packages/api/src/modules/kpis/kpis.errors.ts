import { DomainError } from "../../shared/errors/domain-error";

export class KpiNameTakenError extends DomainError {
	readonly code = "KPI_NAME_TAKEN";
	readonly status = "CONFLICT" as const;

	constructor() {
		super("A KPI with this name already exists");
	}
}
