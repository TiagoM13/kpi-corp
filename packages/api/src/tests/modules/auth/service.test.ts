import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	InvalidCredentialsError,
	InvalidInvitationError,
	InvalidRefreshTokenError,
	InvitationAlreadyUsedError,
	InvitationExpiredError,
} from "../../../modules/auth/auth.errors";
import { authService } from "../../../modules/auth/auth.service";
import {
	generateRefreshTokenPayload,
	hashToken,
	verifyRefreshToken,
} from "../../../modules/auth/auth.tokens";
import {
	AccountDeactivatedError,
	EmailAlreadyRegisteredError,
	UnauthorizedError,
} from "../../../shared/errors/common.errors";
import { hashPassword } from "../../../shared/security/password";
import { hashOpaqueToken } from "../../../shared/security/tokens";

const { repositoryMock } = vi.hoisted(() => {
	return {
		repositoryMock: {
			findUserByEmail: vi.fn(),
			findUserById: vi.fn(),
			findInvitationByTokenHash: vi.fn(),
			createRefreshToken: vi.fn(),
			findRefreshTokenById: vi.fn(),
			revokeRefreshToken: vi.fn(),
			revokeAllRefreshTokensForUser: vi.fn(),
			executeRegisterTransaction: vi.fn(),
		},
	};
});

vi.mock("../../../modules/auth/auth.repository", () => ({
	authRepository: repositoryMock,
}));

const mockUser = {
	id: "b29f5637-0ab1-4de0-b2d2-d364e3903124",
	name: "Admin",
	email: "admin@kpicorp.com",
	passwordHash: "",
	role: "ADMIN" as const,
	position: null,
	active: true,
	createdAt: new Date(),
};

const mockMember = {
	id: "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf",
	name: "Ana Souza",
	email: "ana@kpicorp.com",
	passwordHash: "",
	role: "MEMBER" as const,
	position: null,
	active: true,
	createdAt: new Date(),
};

const mockInvitation = {
	id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
	email: "new@kpicorp.com",
	tokenHash: hashOpaqueToken("invite-token"),
	usedAt: null,
	expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
	createdAt: new Date(),
};

async function createStoredRefreshToken(
	overrides: {
		tokenId?: string;
		user?: typeof mockUser;
		revokedAt?: Date | null;
		expiresAt?: Date;
	} = {},
) {
	const tokenId = overrides.tokenId ?? "c3d4e5f6-a7b8-9012-cdef-345678901234";
	const user = overrides.user ?? mockUser;
	const refreshToken = await generateRefreshTokenPayload(user, tokenId);

	return {
		tokenId,
		refreshToken,
		row: {
			id: tokenId,
			userId: user.id,
			tokenHash: hashToken(refreshToken),
			expiresAt:
				overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			revokedAt: overrides.revokedAt ?? null,
			createdAt: new Date(),
			user,
		},
	};
}

describe("auth service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		repositoryMock.createRefreshToken.mockResolvedValue({});
		repositoryMock.revokeRefreshToken.mockResolvedValue({ count: 1 });
		repositoryMock.revokeAllRefreshTokensForUser.mockResolvedValue({
			count: 1,
		});
	});

	describe("login", () => {
		it("should return session on valid credentials", async () => {
			mockUser.passwordHash = await hashPassword("admin123");
			repositoryMock.findUserByEmail.mockResolvedValueOnce(mockUser);

			const result = await authService.login({
				email: mockUser.email,
				password: "admin123",
			});

			expect(result.user.id).toBe(mockUser.id);
			expect(result.user.email).toBe(mockUser.email);
			expect(result.accessToken).toBeDefined();
			expect(result.refreshToken).toBeDefined();
		});

		it("should look the user up by the lowercased email", async () => {
			mockUser.passwordHash = await hashPassword("admin123");
			repositoryMock.findUserByEmail.mockResolvedValueOnce(mockUser);

			await authService.login({
				email: "Admin@KPICorp.com",
				password: "admin123",
			});

			expect(repositoryMock.findUserByEmail).toHaveBeenCalledWith(
				"admin@kpicorp.com",
			);
		});

		it("should persist the refresh token under the id carried in its payload", async () => {
			mockUser.passwordHash = await hashPassword("admin123");
			repositoryMock.findUserByEmail.mockResolvedValueOnce(mockUser);

			const result = await authService.login({
				email: mockUser.email,
				password: "admin123",
			});

			const payload = await verifyRefreshToken(result.refreshToken);
			const persisted = repositoryMock.createRefreshToken.mock.calls[0]?.[0];

			expect(persisted.id).toBe(payload.tokenId);
			expect(persisted.userId).toBe(mockUser.id);
			expect(persisted.tokenHash).toBe(hashToken(result.refreshToken));
		});

		it("should throw InvalidCredentialsError when user does not exist", async () => {
			repositoryMock.findUserByEmail.mockResolvedValueOnce(null);

			await expect(
				authService.login({ email: "wrong@kpicorp.com", password: "admin123" }),
			).rejects.toThrow(InvalidCredentialsError);
		});

		it("should throw InvalidCredentialsError when password does not match", async () => {
			mockUser.passwordHash = await hashPassword("admin123");
			repositoryMock.findUserByEmail.mockResolvedValueOnce(mockUser);

			await expect(
				authService.login({ email: mockUser.email, password: "wrongpassword" }),
			).rejects.toThrow(InvalidCredentialsError);
		});

		it("should throw AccountDeactivatedError when user is inactive", async () => {
			mockUser.passwordHash = await hashPassword("admin123");
			repositoryMock.findUserByEmail.mockResolvedValueOnce({
				...mockUser,
				active: false,
			});

			await expect(
				authService.login({ email: mockUser.email, password: "admin123" }),
			).rejects.toThrow(AccountDeactivatedError);
		});
	});

	describe("getAuthenticatedUser", () => {
		it("should return authenticated user", async () => {
			repositoryMock.findUserById.mockResolvedValueOnce(mockUser);

			const result = await authService.getAuthenticatedUser(mockUser.id);

			expect(result.id).toBe(mockUser.id);
			expect(result.email).toBe(mockUser.email);
			expect(result.position).toBeNull();
		});

		it("should throw UnauthorizedError when the user is gone", async () => {
			repositoryMock.findUserById.mockResolvedValueOnce(null);

			await expect(
				authService.getAuthenticatedUser(mockUser.id),
			).rejects.toThrow(UnauthorizedError);
		});
	});

	describe("refreshSession", () => {
		it("should rotate the session on a valid refresh token", async () => {
			const { tokenId, refreshToken, row } = await createStoredRefreshToken();
			repositoryMock.findRefreshTokenById.mockResolvedValueOnce(row);

			const result = await authService.refreshSession(refreshToken);

			expect(repositoryMock.findRefreshTokenById).toHaveBeenCalledWith(tokenId);
			expect(repositoryMock.revokeRefreshToken).toHaveBeenCalledWith(tokenId);
			expect(result.user.id).toBe(mockUser.id);
			expect(result.refreshToken).not.toBe(refreshToken);
		});

		it("should reject a token whose stored hash does not match", async () => {
			const { refreshToken, row } = await createStoredRefreshToken();
			repositoryMock.findRefreshTokenById.mockResolvedValueOnce({
				...row,
				tokenHash: hashToken("some-other-token"),
			});

			await expect(authService.refreshSession(refreshToken)).rejects.toThrow(
				InvalidRefreshTokenError,
			);
		});

		it("should reject an unknown token id", async () => {
			const { refreshToken } = await createStoredRefreshToken();
			repositoryMock.findRefreshTokenById.mockResolvedValueOnce(null);

			await expect(authService.refreshSession(refreshToken)).rejects.toThrow(
				InvalidRefreshTokenError,
			);
		});

		it("should reject an expired token", async () => {
			const { refreshToken, row } = await createStoredRefreshToken({
				expiresAt: new Date(Date.now() - 1000),
			});
			repositoryMock.findRefreshTokenById.mockResolvedValueOnce(row);

			await expect(authService.refreshSession(refreshToken)).rejects.toThrow(
				InvalidRefreshTokenError,
			);
		});

		it("should revoke every token of the user when a rotated token is replayed", async () => {
			const { refreshToken, row } = await createStoredRefreshToken({
				revokedAt: new Date(),
			});
			repositoryMock.findRefreshTokenById.mockResolvedValueOnce(row);

			await expect(authService.refreshSession(refreshToken)).rejects.toThrow(
				InvalidRefreshTokenError,
			);
			expect(repositoryMock.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(
				mockUser.id,
			);
		});

		it("should reject when a concurrent refresh already rotated the token", async () => {
			const { refreshToken, row } = await createStoredRefreshToken();
			repositoryMock.findRefreshTokenById.mockResolvedValueOnce(row);
			repositoryMock.revokeRefreshToken.mockResolvedValueOnce({ count: 0 });

			await expect(authService.refreshSession(refreshToken)).rejects.toThrow(
				InvalidRefreshTokenError,
			);
			expect(repositoryMock.createRefreshToken).not.toHaveBeenCalled();
		});

		it("should throw AccountDeactivatedError when the user is inactive", async () => {
			const { refreshToken, row } = await createStoredRefreshToken({
				user: { ...mockUser, active: false },
			});
			repositoryMock.findRefreshTokenById.mockResolvedValueOnce(row);

			await expect(authService.refreshSession(refreshToken)).rejects.toThrow(
				AccountDeactivatedError,
			);
		});
	});

	describe("logout", () => {
		it("should return success even without token", async () => {
			const result = await authService.logout();

			expect(result.success).toBe(true);
			expect(repositoryMock.revokeRefreshToken).not.toHaveBeenCalled();
		});

		it("should revoke the stored token", async () => {
			const { tokenId, refreshToken, row } = await createStoredRefreshToken();
			repositoryMock.findRefreshTokenById.mockResolvedValueOnce(row);

			const result = await authService.logout(refreshToken);

			expect(result.success).toBe(true);
			expect(repositoryMock.revokeRefreshToken).toHaveBeenCalledWith(tokenId);
		});

		it("should ignore a token that is not stored", async () => {
			const { refreshToken } = await createStoredRefreshToken();
			repositoryMock.findRefreshTokenById.mockResolvedValueOnce(null);

			const result = await authService.logout(refreshToken);

			expect(result.success).toBe(true);
			expect(repositoryMock.revokeRefreshToken).not.toHaveBeenCalled();
		});

		it("should ignore a malformed token", async () => {
			const result = await authService.logout("not-a-jwt");

			expect(result.success).toBe(true);
			expect(repositoryMock.revokeRefreshToken).not.toHaveBeenCalled();
		});
	});

	describe("validateInvitation", () => {
		it("should return the invitation email when the token is valid", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce(
				mockInvitation,
			);

			const result = await authService.validateInvitation("invite-token");

			expect(result).toEqual({ status: "VALID", email: mockInvitation.email });
			expect(repositoryMock.findInvitationByTokenHash).toHaveBeenCalledWith(
				hashOpaqueToken("invite-token"),
			);
		});

		it("should return INVALID when the token does not exist", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce(null);

			expect(await authService.validateInvitation("unknown")).toEqual({
				status: "INVALID",
			});
		});

		it("should return USED when the invitation was already consumed", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce({
				...mockInvitation,
				usedAt: new Date(),
			});

			expect(await authService.validateInvitation("invite-token")).toEqual({
				status: "USED",
			});
		});

		it("should return EXPIRED when the invitation is past its deadline", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce({
				...mockInvitation,
				expiresAt: new Date(Date.now() - 1000),
			});

			expect(await authService.validateInvitation("invite-token")).toEqual({
				status: "EXPIRED",
			});
		});

		it("should report USED before EXPIRED, like register does", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce({
				...mockInvitation,
				usedAt: new Date(),
				expiresAt: new Date(Date.now() - 1000),
			});

			expect(await authService.validateInvitation("invite-token")).toEqual({
				status: "USED",
			});
		});

		it("should not consume the invitation", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce(
				mockInvitation,
			);

			await authService.validateInvitation("invite-token");

			expect(repositoryMock.executeRegisterTransaction).not.toHaveBeenCalled();
		});
	});

	describe("register", () => {
		it("should create a member from a valid invitation", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce(
				mockInvitation,
			);
			repositoryMock.findUserByEmail.mockResolvedValueOnce(null);
			repositoryMock.executeRegisterTransaction.mockResolvedValueOnce({
				outcome: "OK",
				user: mockMember,
			});

			const result = await authService.register({
				token: "invite-token",
				name: "Ana Souza",
				password: "member123",
			});

			expect(result.user.role).toBe("MEMBER");
			expect(result.accessToken).toBeDefined();
			expect(result.refreshToken).toBeDefined();
		});

		it("should look the invitation up by the sha-256 of the token", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce(
				mockInvitation,
			);
			repositoryMock.findUserByEmail.mockResolvedValueOnce(null);
			repositoryMock.executeRegisterTransaction.mockResolvedValueOnce({
				outcome: "OK",
				user: mockMember,
			});

			await authService.register({
				token: "invite-token",
				name: "Ana Souza",
				password: "member123",
			});

			expect(repositoryMock.findInvitationByTokenHash).toHaveBeenCalledWith(
				hashOpaqueToken("invite-token"),
			);
		});

		it("should store the position sent by the invitee", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce(
				mockInvitation,
			);
			repositoryMock.findUserByEmail.mockResolvedValueOnce(null);
			repositoryMock.executeRegisterTransaction.mockResolvedValueOnce({
				outcome: "OK",
				user: mockMember,
			});

			await authService.register({
				token: "invite-token",
				name: "Ana Souza",
				position: "Designer",
				password: "member12345",
			});

			expect(repositoryMock.executeRegisterTransaction).toHaveBeenCalledWith(
				mockInvitation.id,
				expect.objectContaining({ position: "Designer" }),
			);
		});

		it("should store a null position when the invitee omits it", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce(
				mockInvitation,
			);
			repositoryMock.findUserByEmail.mockResolvedValueOnce(null);
			repositoryMock.executeRegisterTransaction.mockResolvedValueOnce({
				outcome: "OK",
				user: mockMember,
			});

			await authService.register({
				token: "invite-token",
				name: "Ana Souza",
				password: "member12345",
			});

			expect(repositoryMock.executeRegisterTransaction).toHaveBeenCalledWith(
				mockInvitation.id,
				expect.objectContaining({ position: null }),
			);
		});

		it("should throw InvalidInvitationError when token does not exist", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce(null);

			await expect(
				authService.register({
					token: "invalid",
					name: "Ana",
					password: "member123",
				}),
			).rejects.toThrow(InvalidInvitationError);
		});

		it("should throw InvitationAlreadyUsedError when invitation was consumed", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce({
				...mockInvitation,
				usedAt: new Date(),
			});

			await expect(
				authService.register({
					token: "invite-token",
					name: "Ana",
					password: "member123",
				}),
			).rejects.toThrow(InvitationAlreadyUsedError);
		});

		it("should throw InvitationExpiredError when invitation is expired", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce({
				...mockInvitation,
				expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
			});

			await expect(
				authService.register({
					token: "invite-token",
					name: "Ana",
					password: "member123",
				}),
			).rejects.toThrow(InvitationExpiredError);
		});

		it("should throw EmailAlreadyRegisteredError when email exists", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce(
				mockInvitation,
			);
			repositoryMock.findUserByEmail.mockResolvedValueOnce(mockMember);

			await expect(
				authService.register({
					token: "invite-token",
					name: "Ana",
					password: "member123",
				}),
			).rejects.toThrow(EmailAlreadyRegisteredError);
		});

		it("should throw EmailAlreadyRegisteredError when the email is taken inside the transaction", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce(
				mockInvitation,
			);
			repositoryMock.findUserByEmail.mockResolvedValueOnce(null);
			repositoryMock.executeRegisterTransaction.mockResolvedValueOnce({
				outcome: "EMAIL_TAKEN",
			});

			await expect(
				authService.register({
					token: "invite-token",
					name: "Ana",
					password: "member123",
				}),
			).rejects.toThrow(EmailAlreadyRegisteredError);
		});

		it("should throw InvitationAlreadyUsedError when the claim loses the race", async () => {
			repositoryMock.findInvitationByTokenHash.mockResolvedValueOnce(
				mockInvitation,
			);
			repositoryMock.findUserByEmail.mockResolvedValueOnce(null);
			repositoryMock.executeRegisterTransaction.mockResolvedValueOnce({
				outcome: "ALREADY_USED",
			});

			await expect(
				authService.register({
					token: "invite-token",
					name: "Ana",
					password: "member123",
				}),
			).rejects.toThrow(InvitationAlreadyUsedError);
		});
	});
});
