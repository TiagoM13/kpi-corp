import { ORPCError } from "@orpc/client";

import {
	clearStoredSession,
	readStoredSession,
	type SessionUser,
	writeStoredSession,
} from "./session-store";

export type AuthResponse = {
	accessToken: string;
	refreshToken: string;
	user: {
		id: string;
		name: string;
		email: string;
		position: string | null;
		role: SessionUser["role"];
	};
};

type RefreshCall = (refreshToken: string) => Promise<AuthResponse>;

type RefreshOnce = () => Promise<string | null>;

function hasDomainCode(data: unknown) {
	return typeof data === "object" && data !== null && "code" in data;
}

/** `protectedProcedure` recusa sem `data.code`; erro de dominio sempre traz um. */
export function isExpiredAccessError(error: unknown) {
	return (
		error instanceof ORPCError &&
		error.code === "UNAUTHORIZED" &&
		!hasDomainCode(error.data)
	);
}

export function readAccessToken() {
	return readStoredSession()?.accessToken ?? null;
}

export function toStoredSession({
	accessToken,
	refreshToken,
	user: { id, ...user },
}: AuthResponse) {
	return { accessToken, refreshToken, user: { userId: id, ...user } };
}

/**
 * Cada refresh rotaciona o token e um token reusado revoga a sessao inteira no
 * servidor. Requests que expiram juntas precisam dividir a mesma rotacao.
 */
export function createRefresher(refresh: RefreshCall) {
	let inflight: Promise<string | null> | null = null;

	async function rotate(): Promise<string | null> {
		const stored = readStoredSession();

		if (!stored) {
			return null;
		}

		try {
			const next = toStoredSession(await refresh(stored.refreshToken));
			writeStoredSession(next);
			return next.accessToken;
		} catch (error) {
			if (error instanceof ORPCError && error.status < 500) {
				clearStoredSession();
				return null;
			}

			throw error;
		}
	}

	return function refreshOnce() {
		inflight ??= rotate().finally(() => {
			inflight = null;
		});

		return inflight;
	};
}

export function createSessionInterceptor(refreshOnce: RefreshOnce) {
	return async function retryWithFreshToken({
		next,
	}: {
		next: () => Promise<unknown>;
	}) {
		const sentWith = readAccessToken();

		try {
			return await next();
		} catch (error) {
			if (!sentWith || !isExpiredAccessError(error)) {
				throw error;
			}

			const current = readAccessToken();
			const renewed =
				current && current !== sentWith ? current : await refreshOnce();

			if (!renewed) {
				clearStoredSession();
				throw error;
			}

			return next();
		}
	};
}
