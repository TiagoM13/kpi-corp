import type { AppRouterClient } from "@kpi-corp/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
	createRefresher,
	createSessionInterceptor,
	isExpiredAccessError,
	readAccessToken,
} from "@/lib/refresh";

export function createQueryClient() {
	return new QueryClient({
		queryCache: new QueryCache({
			onError: (error, query) => {
				if (isExpiredAccessError(error)) {
					return;
				}

				toast.error(`Error: ${error.message}`, {
					action: {
						label: "retry",
						onClick: () => {
							query.invalidate();
						},
					},
				});
			},
		}),
	});
}

export const queryClient = createQueryClient();

function getServerUrl(url: string) {
	const processEnv = (
		globalThis as {
			process?: { env?: Record<string, string | undefined> };
		}
	).process?.env;
	if (typeof window === "undefined" && processEnv?.SERVER_URL) {
		return processEnv.SERVER_URL.endsWith("/")
			? processEnv.SERVER_URL.slice(0, -1)
			: processEnv.SERVER_URL;
	}

	const normalized = url.endsWith("/") ? url.slice(0, -1) : url;

	if (!normalized.startsWith("/")) {
		return normalized;
	}

	if (typeof window !== "undefined") {
		return `${window.location.origin}${normalized}`;
	}

	const vercelUrl =
		processEnv?.VERCEL_ENV === "production"
			? (processEnv?.VERCEL_PROJECT_PRODUCTION_URL ?? processEnv?.VERCEL_URL)
			: (processEnv?.VERCEL_URL ?? processEnv?.VERCEL_PROJECT_PRODUCTION_URL);
	if (vercelUrl) {
		const origin = vercelUrl.startsWith("http")
			? vercelUrl
			: `https://${vercelUrl}`;
		return `${origin}${normalized}`;
	}

	return `http://localhost:3000${normalized}`;
}

// `@kpi-corp/env/web` valida com Zod no momento do import. Estatico, isso ancora
// o zod no chunk de entrada, que toda rota baixa e executa no boot. Resolvido sob
// demanda, o env (e o zod junto) so carrega na primeira chamada RPC.
let rpcUrl: Promise<string> | undefined;

async function resolveRpcUrl(): Promise<string> {
	const { env } = await import("@kpi-corp/env/web");
	return `${getServerUrl(env.VITE_SERVER_URL)}/rpc`;
}

export const link = new RPCLink({
	url: () => {
		rpcUrl ??= resolveRpcUrl();
		return rpcUrl;
	},
	headers: (): Record<string, string> => {
		const accessToken = readAccessToken();
		return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
	},
	interceptors: [(options) => sessionInterceptor(options)],
});

export const client: AppRouterClient = createORPCClient(link);

export const refreshOnce = createRefresher((refreshToken) =>
	client.auth.refresh({ refreshToken }),
);

const sessionInterceptor = createSessionInterceptor(refreshOnce);

export const orpc = createTanstackQueryUtils(client);
