import type { IncomingHttpHeaders } from "node:http";

export async function createContext(req: IncomingHttpHeaders) {
	void req;
	return {
		auth: null,
		session: null,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
