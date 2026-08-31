import { randomUUID } from "node:crypto";
import { env } from "@kpi-corp/env/server";

import {
	hashOpaqueToken,
	signToken,
	tokenHashMatches,
	verifyToken,
} from "../../shared/security/tokens";

import type { AuthUser } from "./auth.mapper";

export type AccessTokenPayload = {
	sub: string;
	email: string;
	role: "ADMIN" | "MEMBER";
};

export type RefreshTokenPayload = {
	sub: string;
	tokenId: string;
};

export async function generateAccessToken(user: AuthUser): Promise<string> {
	return signToken(
		{
			sub: user.id,
			email: user.email,
			role: user.role,
		},
		env.JWT_SECRET,
		env.JWT_ACCESS_EXPIRES_IN,
	);
}

export async function verifyAccessToken(
	token: string,
): Promise<AccessTokenPayload> {
	return verifyToken(token, env.JWT_SECRET);
}

export async function generateRefreshTokenPayload(
	user: AuthUser,
	tokenId: string,
): Promise<string> {
	return signToken(
		{
			sub: user.id,
			tokenId,
		},
		env.JWT_REFRESH_SECRET,
		env.JWT_REFRESH_EXPIRES_IN,
	);
}

export async function verifyRefreshToken(
	token: string,
): Promise<RefreshTokenPayload> {
	return verifyToken(token, env.JWT_REFRESH_SECRET);
}

export function hashToken(token: string): string {
	return hashOpaqueToken(token);
}

export function verifyTokenHash(token: string, storedHash: string): boolean {
	return tokenHashMatches(token, storedHash);
}

export function generateTokenId(): string {
	return randomUUID();
}
