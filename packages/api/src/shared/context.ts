import type { IncomingHttpHeaders } from "node:http";

import { verifyAccessToken } from "./security/access-token";

export async function createContext(headers: IncomingHttpHeaders) {
	const authHeader = headers.authorization ?? "";
	const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

	let auth: { userId: string; email: string; role: "ADMIN" | "MEMBER" } | null =
		null;

	if (token) {
		try {
			const payload = await verifyAccessToken(token);
			auth = {
				userId: payload.sub,
				email: payload.email,
				role: payload.role,
			};
		} catch {
			auth = null;
		}
	}

	return {
		headers,
		auth,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
