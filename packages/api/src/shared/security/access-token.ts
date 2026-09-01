import { env } from "@kpi-corp/env/server";

import { signToken, verifyToken } from "./tokens";

export type Role = "ADMIN" | "MEMBER";

export type AccessTokenPayload = {
	sub: string;
	email: string;
	role: Role;
};

export type AccessTokenSubject = {
	id: string;
	email: string;
	role: Role;
};

export async function signAccessToken(
	subject: AccessTokenSubject,
): Promise<string> {
	return signToken(
		{ sub: subject.id, email: subject.email, role: subject.role },
		env.JWT_SECRET,
		env.JWT_ACCESS_EXPIRES_IN,
	);
}

export async function verifyAccessToken(
	token: string,
): Promise<AccessTokenPayload> {
	return verifyToken(token, env.JWT_SECRET);
}
