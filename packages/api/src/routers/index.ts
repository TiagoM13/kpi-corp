import type { RouterClient } from "@orpc/server";

import { assignmentsRouter } from "../modules/assignments";
import { authRouter } from "../modules/auth";
import { kpisRouter } from "../modules/kpis";
import { meetingsRouter } from "../modules/meetings";
import { membersRouter } from "../modules/members";
import { profileRouter } from "../modules/profile";

export const appRouter = {
	assignments: assignmentsRouter,
	auth: authRouter,
	kpis: kpisRouter,
	members: membersRouter,
	meetings: meetingsRouter,
	profile: profileRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
