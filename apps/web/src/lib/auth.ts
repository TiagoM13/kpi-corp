import { ORPCError } from "@orpc/client";

import { type AuthResponse, toStoredSession } from "@/lib/refresh";
import {
	clearStoredSession,
	readStoredSession,
	type SessionUser,
	writeStoredSession,
} from "@/lib/session-store";
import { client } from "@/utils/orpc";

export type Session = SessionUser;

export class InvalidCredentialsError extends Error {
	constructor() {
		super("E-mail ou senha incorretos.");
		this.name = "InvalidCredentialsError";
	}
}

export class AccountDeactivatedError extends Error {
	constructor() {
		super("Sua conta foi desativada. Fale com o administrador do time.");
		this.name = "AccountDeactivatedError";
	}
}

export function domainCodeOf(error: unknown): string | null {
	if (!(error instanceof ORPCError)) {
		return null;
	}

	const data: unknown = error.data;

	if (typeof data !== "object" || data === null || !("code" in data)) {
		return null;
	}

	return typeof data.code === "string" ? data.code : null;
}

export function getSession(): Session | null {
	return readStoredSession()?.user ?? null;
}

export function startSession(response: AuthResponse): Session {
	const stored = toStoredSession(response);
	writeStoredSession(stored);
	return stored.user;
}

export async function signIn(
	email: string,
	password: string,
): Promise<Session> {
	try {
		return startSession(await client.auth.login({ email, password }));
	} catch (error) {
		const code = domainCodeOf(error);

		if (code === "INVALID_CREDENTIALS") {
			throw new InvalidCredentialsError();
		}

		if (code === "ACCOUNT_DEACTIVATED") {
			throw new AccountDeactivatedError();
		}

		throw error;
	}
}

export async function signOut() {
	const refreshToken = readStoredSession()?.refreshToken;

	try {
		await client.auth.logout({ refreshToken });
	} catch {
		// a sessao local sai mesmo sem resposta do servidor
	} finally {
		clearStoredSession();
	}
}

export function syncSessionUser(user: AuthResponse["user"]): Session | null {
	const stored = readStoredSession();

	if (!stored) {
		return null;
	}

	const { user: next } = toStoredSession({ ...stored, user });
	writeStoredSession({ ...stored, user: next });
	return next;
}

export function homeRouteFor(role: Session["role"]): "/admin" | "/dashboard" {
	return role === "ADMIN" ? "/admin" : "/dashboard";
}
