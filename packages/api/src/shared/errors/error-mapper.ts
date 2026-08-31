import { ORPCError } from "@orpc/server";

import { DomainError } from "./domain-error";

export function mapDomainErrorToORPCError(
	err: unknown,
): ORPCError<string, unknown> {
	if (err instanceof DomainError) {
		return new ORPCError(err.status, {
			message: err.message,
			data: { code: err.code },
		});
	}

	console.error("Unhandled error:", err);

	return new ORPCError("INTERNAL_SERVER_ERROR", {
		message: "Unexpected error",
	});
}
