import { ORPCError } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import {
	InvalidCredentialsError,
	InvalidRefreshTokenError,
	InvitationAlreadyUsedError,
} from "../../../modules/auth/auth.errors";
import {
	AccountDeactivatedError,
	EmailAlreadyRegisteredError,
} from "../../../shared/errors/common.errors";
import { mapDomainErrorToORPCError } from "../../../shared/errors/error-mapper";

describe("mapDomainErrorToORPCError", () => {
	it.each([
		[new InvalidCredentialsError(), "UNAUTHORIZED"],
		[new InvalidRefreshTokenError(), "UNAUTHORIZED"],
		[new AccountDeactivatedError(), "FORBIDDEN"],
		[new InvitationAlreadyUsedError(), "CONFLICT"],
		[new EmailAlreadyRegisteredError(), "CONFLICT"],
	])("should map $constructor.name to %s", (error, expectedCode) => {
		const mapped = mapDomainErrorToORPCError(error);

		expect(mapped).toBeInstanceOf(ORPCError);
		expect(mapped.code).toBe(expectedCode);
		expect(mapped.message).toBe(error.message);
		expect(mapped.data).toEqual({ code: error.code });
	});

	it("should hide unknown errors behind INTERNAL_SERVER_ERROR", () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const mapped = mapDomainErrorToORPCError(new Error("db connection lost"));

		expect(mapped.code).toBe("INTERNAL_SERVER_ERROR");
		expect(mapped.message).toBe("Unexpected error");
		expect(mapped.message).not.toContain("db connection lost");

		consoleError.mockRestore();
	});
});
