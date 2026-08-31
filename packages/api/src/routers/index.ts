import type { RouterClient } from "@orpc/server";

import { authRouter } from "../modules/auth";

export const appRouter = {
	auth: authRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
