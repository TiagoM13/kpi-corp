import { createProcedureClient, ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvalidCredentialsError } from "../../../modules/auth/auth.errors";
import { authRouter } from "../../../modules/auth/auth.router";
import { AccountDeactivatedError } from "../../../shared/errors/common.errors";

const { serviceMock } = vi.hoisted(() => {
	return {
		serviceMock: {
			login: vi.fn(),
			getAuthenticatedUser: vi.fn(),
			refreshSession: vi.fn(),
			logout: vi.fn(),
			register: vi.fn(),
		},
	};
});

vi.mock("../../../modules/auth/auth.service", () => ({
	authService: serviceMock,
}));

const mockSession = {
	accessToken: "access-token",
	refreshToken: "refresh-token",
	user: {
		id: "b29f5637-0ab1-4de0-b2d2-d364e3903124",
		name: "Admin",
		email: "admin@kpicorp.com",
		role: "ADMIN" as const,
		position: null,
	},
};

function createCaller() {
	const context = { auth: null, headers: {} };

	return {
		login: createProcedureClient(authRouter.login, { context }),
		me: createProcedureClient(authRouter.me, { context }),
		refresh: createProcedureClient(authRouter.refresh, { context }),
		logout: createProcedureClient(authRouter.logout, { context }),
		register: createProcedureClient(authRouter.register, { context }),
	};
}

describe("auth router", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("login", () => {
		it("should return session from service", async () => {
			serviceMock.login.mockResolvedValueOnce(mockSession);

			const caller = createCaller();
			const result = await caller.login({
				email: "admin@kpicorp.com",
				password: "admin123",
			});

			expect(result).toEqual(mockSession);
			expect(serviceMock.login).toHaveBeenCalledWith({
				email: "admin@kpicorp.com",
				password: "admin123",
			});
		});
	});

	describe("me", () => {
		it("should return authenticated user", async () => {
			serviceMock.getAuthenticatedUser.mockResolvedValueOnce({
				...mockSession.user,
				position: null,
			});

			const meCaller = createProcedureClient(authRouter.me, {
				context: {
					auth: {
						userId: mockSession.user.id,
						email: mockSession.user.email,
						role: mockSession.user.role,
					},
					headers: {},
				},
			});

			const result = await meCaller();

			expect(result.id).toBe(mockSession.user.id);
			expect(serviceMock.getAuthenticatedUser).toHaveBeenCalledWith(
				mockSession.user.id,
			);
		});

		it("should reject with UNAUTHORIZED when not authenticated", async () => {
			const caller = createCaller();

			await expect(caller.me()).rejects.toMatchObject({
				code: "UNAUTHORIZED",
			});
			expect(serviceMock.getAuthenticatedUser).not.toHaveBeenCalled();
		});
	});

	describe("refresh", () => {
		it("should return tokens from service", async () => {
			const refreshResult = mockSession;
			serviceMock.refreshSession.mockResolvedValueOnce(refreshResult);

			const caller = createCaller();
			const result = await caller.refresh({ refreshToken: "token" });

			expect(result).toEqual(refreshResult);
			expect(serviceMock.refreshSession).toHaveBeenCalledWith("token");
		});
	});

	describe("logout", () => {
		it("should return success", async () => {
			serviceMock.logout.mockResolvedValueOnce({ success: true });

			const caller = createCaller();
			const result = await caller.logout({ refreshToken: "token" });

			expect(result.success).toBe(true);
			expect(serviceMock.logout).toHaveBeenCalledWith("token");
		});
	});

	describe("register", () => {
		it("should return session from service", async () => {
			serviceMock.register.mockResolvedValueOnce(mockSession);

			const caller = createCaller();
			const result = await caller.register({
				token: "invite-token",
				name: "Ana Souza",
				password: "member123",
			});

			expect(result).toEqual(mockSession);
			expect(serviceMock.register).toHaveBeenCalledWith({
				token: "invite-token",
				name: "Ana Souza",
				password: "member123",
			});
		});
	});

	describe("register input", () => {
		it("should reject a password shorter than 8 characters", async () => {
			const caller = createCaller();

			await expect(
				caller.register({
					token: "invite-token",
					name: "Ana",
					password: "1234567",
				}),
			).rejects.toThrow();
			expect(serviceMock.register).not.toHaveBeenCalled();
		});

		it("should accept a password with exactly 8 characters", async () => {
			serviceMock.register.mockResolvedValueOnce(mockSession);

			const caller = createCaller();
			await caller.register({
				token: "invite-token",
				name: "Ana",
				password: "12345678",
			});

			expect(serviceMock.register).toHaveBeenCalled();
		});

		it("should forward the position to the service", async () => {
			serviceMock.register.mockResolvedValueOnce(mockSession);

			const caller = createCaller();
			await caller.register({
				token: "invite-token",
				name: "Ana",
				position: "Designer",
				password: "12345678",
			});

			expect(serviceMock.register).toHaveBeenCalledWith(
				expect.objectContaining({ position: "Designer" }),
			);
		});
	});

	describe("domain error mapping", () => {
		it("should map InvalidCredentialsError to UNAUTHORIZED", async () => {
			serviceMock.login.mockRejectedValueOnce(new InvalidCredentialsError());

			const caller = createCaller();
			const error = await caller
				.login({ email: "admin@kpicorp.com", password: "wrong" })
				.catch((err: unknown) => err);

			expect(error).toBeInstanceOf(ORPCError);
			expect((error as ORPCError<string, unknown>).code).toBe("UNAUTHORIZED");
		});

		it("should map AccountDeactivatedError to FORBIDDEN", async () => {
			serviceMock.login.mockRejectedValueOnce(new AccountDeactivatedError());

			const caller = createCaller();
			const error = await caller
				.login({ email: "admin@kpicorp.com", password: "admin123" })
				.catch((err: unknown) => err);

			expect((error as ORPCError<string, unknown>).code).toBe("FORBIDDEN");
		});

		it("should not leak an unexpected error to the client", async () => {
			const consoleError = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			serviceMock.login.mockRejectedValueOnce(new Error("db connection lost"));

			const caller = createCaller();
			const error = await caller
				.login({ email: "admin@kpicorp.com", password: "admin123" })
				.catch((err: unknown) => err);

			expect((error as ORPCError<string, unknown>).code).toBe(
				"INTERNAL_SERVER_ERROR",
			);
			expect((error as Error).message).not.toContain("db connection lost");

			consoleError.mockRestore();
		});
	});
});
