import { env } from "@kpi-corp/env/server";
import {
	EmailAlreadyRegisteredError,
	UnauthorizedError,
} from "../../shared/errors/common.errors";
import {
	DUMMY_PASSWORD_HASH,
	hashPassword,
	verifyPassword,
} from "../../shared/security/password";
import { durationToMs } from "../../shared/security/tokens";
import {
	AccountDeactivatedError,
	InvalidCredentialsError,
	InvalidInvitationError,
	InvalidRefreshTokenError,
	InvitationAlreadyUsedError,
	InvitationExpiredError,
} from "./auth.errors";
import {
	mapUserToAuthUser,
	mapUserToPublicUser,
	type PublicUser,
	type UserForAuthMapping,
} from "./auth.mapper";
import { authRepository } from "./auth.repository";
import {
	generateAccessToken,
	generateRefreshTokenPayload,
	generateTokenId,
	hashToken,
	verifyRefreshToken,
	verifyTokenHash,
} from "./auth.tokens";

export type Session = {
	accessToken: string;
	refreshToken: string;
	user: PublicUser;
};

export type LoginInput = {
	email: string;
	password: string;
};

export type RegisterInput = {
	token: string;
	name: string;
	position?: string;
	password: string;
};

async function issueSession(user: UserForAuthMapping): Promise<Session> {
	const authUser = mapUserToAuthUser(user);
	const tokenId = generateTokenId();

	const [accessToken, refreshToken] = await Promise.all([
		generateAccessToken(authUser),
		generateRefreshTokenPayload(authUser, tokenId),
	]);

	await authRepository.createRefreshToken({
		id: tokenId,
		userId: user.id,
		tokenHash: hashToken(refreshToken),
		expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN)),
	});

	return {
		accessToken,
		refreshToken,
		user: mapUserToPublicUser(user),
	};
}

export const authService = {
	async login(input: LoginInput): Promise<Session> {
		const user = await authRepository.findUserByEmail(input.email);

		const passwordMatches = await verifyPassword(
			input.password,
			user?.passwordHash ?? DUMMY_PASSWORD_HASH,
		);

		if (!user || !passwordMatches) {
			throw new InvalidCredentialsError();
		}

		if (!user.active) {
			throw new AccountDeactivatedError();
		}

		return issueSession(user);
	},

	async getAuthenticatedUser(userId: string) {
		const user = await authRepository.findUserById(userId);

		if (!user) {
			throw new UnauthorizedError();
		}

		return {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			position: user.position,
		};
	},

	async refreshSession(refreshToken: string): Promise<Session> {
		const payload = await verifyRefreshToken(refreshToken).catch(() => null);

		if (!payload) {
			throw new InvalidRefreshTokenError();
		}

		const storedToken = await authRepository.findRefreshTokenById(
			payload.tokenId,
		);

		if (!storedToken || !verifyTokenHash(refreshToken, storedToken.tokenHash)) {
			throw new InvalidRefreshTokenError();
		}

		if (storedToken.revokedAt) {
			await authRepository.revokeAllRefreshTokensForUser(storedToken.userId);
			throw new InvalidRefreshTokenError();
		}

		if (storedToken.expiresAt < new Date()) {
			throw new InvalidRefreshTokenError();
		}

		if (!storedToken.user.active) {
			throw new AccountDeactivatedError();
		}

		const revoked = await authRepository.revokeRefreshToken(storedToken.id);

		if (revoked.count === 0) {
			throw new InvalidRefreshTokenError();
		}

		return issueSession(storedToken.user);
	},

	async logout(refreshToken?: string): Promise<{ success: true }> {
		if (!refreshToken) {
			return { success: true };
		}

		const payload = await verifyRefreshToken(refreshToken).catch(() => null);

		if (!payload) {
			return { success: true };
		}

		const storedToken = await authRepository.findRefreshTokenById(
			payload.tokenId,
		);

		if (storedToken && verifyTokenHash(refreshToken, storedToken.tokenHash)) {
			await authRepository.revokeRefreshToken(storedToken.id);
		}

		return { success: true };
	},

	async register(input: RegisterInput): Promise<Session> {
		const invitation = await authRepository.findInvitationByToken(input.token);

		if (!invitation) {
			throw new InvalidInvitationError();
		}

		if (invitation.usedAt) {
			throw new InvitationAlreadyUsedError();
		}

		if (invitation.expiresAt < new Date()) {
			throw new InvitationExpiredError();
		}

		const existingUser = await authRepository.findUserByEmail(invitation.email);

		if (existingUser) {
			throw new EmailAlreadyRegisteredError();
		}

		const passwordHash = await hashPassword(input.password);

		const result = await authRepository.executeRegisterTransaction(
			invitation.id,
			{
				name: input.name,
				email: invitation.email,
				position: input.position ?? null,
				passwordHash,
				role: "MEMBER",
			},
		);

		if (result.outcome === "EMAIL_TAKEN") {
			throw new EmailAlreadyRegisteredError();
		}

		if (result.outcome === "ALREADY_USED") {
			throw new InvitationAlreadyUsedError();
		}

		return issueSession(result.user);
	},
};

export type AuthService = typeof authService;
