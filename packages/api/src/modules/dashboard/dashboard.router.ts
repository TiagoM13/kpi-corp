import { adminProcedure, protectedProcedure } from "../../index";
import { handle } from "../../shared/errors/handle";
import {
	adminDashboardResponseSchema,
	memberDashboardResponseSchema,
	pointsSeriesInputSchema,
	pointsSeriesResponseSchema,
} from "./dashboard.schema";
import { dashboardService } from "./dashboard.service";

export const dashboardRouter = {
	getMember: protectedProcedure
		.route({ method: "GET", path: "/dashboard/member" })
		.output(memberDashboardResponseSchema)
		.handler(({ context }) =>
			handle(() => dashboardService.getMemberDashboard(context.auth.userId)),
		),

	getAdmin: adminProcedure
		.route({ method: "GET", path: "/dashboard/admin" })
		.output(adminDashboardResponseSchema)
		.handler(() => handle(() => dashboardService.getAdminDashboard())),

	getPointsSeries: adminProcedure
		.route({ method: "GET", path: "/dashboard/admin/points-series" })
		.input(pointsSeriesInputSchema)
		.output(pointsSeriesResponseSchema)
		.handler(({ input }) =>
			handle(() => dashboardService.getPointsSeries(input.period)),
		),
};
