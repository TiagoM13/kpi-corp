import { env } from "@kpi-corp/env/server";
import z from "zod";

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

const ACCESS_TOKEN_TYPE = "access";

const accessTokenPayloadSchema = z.object({
	sub: z.string().min(1),
	email: z.string().min(1),
	role: z.enum(["ADMIN", "MEMBER"]),
	typ: z.literal(ACCESS_TOKEN_TYPE),
});

export async function signAccessToken(
	subject: AccessTokenSubject,
): Promise<string> {
	return signToken(
		{
			sub: subject.id,
			email: subject.email,
			role: subject.role,
			typ: ACCESS_TOKEN_TYPE,
		},
		env.JWT_SECRET,
		env.JWT_ACCESS_EXPIRES_IN,
	);
}

export async function verifyAccessToken(
	token: string,
): Promise<AccessTokenPayload> {
	const payload = accessTokenPayloadSchema.parse(
		await verifyToken(token, env.JWT_SECRET),
	);

	return { sub: payload.sub, email: payload.email, role: payload.role };
}
