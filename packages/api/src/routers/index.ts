import type { RouterClient } from "@orpc/server";

import { assignmentsRouter } from "../modules/assignments";
import { authRouter } from "../modules/auth";
import { dashboardRouter } from "../modules/dashboard";
import { kpisRouter } from "../modules/kpis";
import { meetingsRouter } from "../modules/meetings";
import { membersRouter } from "../modules/members";
import { profileRouter } from "../modules/profile";
import { rankingRouter } from "../modules/ranking";

export const appRouter = {
	assignments: assignmentsRouter,
	auth: authRouter,
	dashboard: dashboardRouter,
	kpis: kpisRouter,
	members: membersRouter,
	meetings: meetingsRouter,
	profile: profileRouter,
	ranking: rankingRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
