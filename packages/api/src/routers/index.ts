import type { RouterClient } from "@orpc/server";

import { assignmentsRouter } from "../modules/assignments";
import { authRouter } from "../modules/auth";
import { kpisRouter } from "../modules/kpis";
import { membersRouter } from "../modules/members";

export const appRouter = {
	assignments: assignmentsRouter,
	auth: authRouter,
	kpis: kpisRouter,
	members: membersRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
