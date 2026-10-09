import type { IncomingHttpHeaders } from "node:http";

import { verifyAccessToken } from "./security/access-token";
import { sessionRepository } from "./security/session.repository";

export async function createContext(headers: IncomingHttpHeaders) {
	const authHeader = headers.authorization ?? "";
	const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

	let auth: { userId: string; email: string; role: "ADMIN" | "MEMBER" } | null =
		null;

	if (token) {
		try {
			const payload = await verifyAccessToken(token);
			const user = await sessionRepository.findUserStatus(payload.sub);

			if (user?.active) {
				auth = {
					userId: payload.sub,
					email: payload.email,
					role: user.role,
				};
			}
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
