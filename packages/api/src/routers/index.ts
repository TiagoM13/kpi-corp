import type { RouterClient } from "@orpc/server";

import { authRouter } from "../modules/auth";
import { membersRouter } from "../modules/members";

export const appRouter = {
	auth: authRouter,
	members: membersRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
