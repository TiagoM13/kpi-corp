import { protectedProcedure } from "../../index";
import { handle } from "../../shared/errors/handle";
import {
	memberProfileInputSchema,
	myKpisInputSchema,
	myKpisResponseSchema,
	myKpisSummaryResponseSchema,
	myProfileResponseSchema,
	myScoreResponseSchema,
	publicProfileResponseSchema,
} from "./profile.schema";
import { profileService } from "./profile.service";

export const profileRouter = {
	getMyScore: protectedProcedure
		.route({ method: "GET", path: "/me/score" })
		.output(myScoreResponseSchema)
		.handler(({ context }) =>
			handle(() => profileService.getMyScore(context.auth.userId)),
		),

	getMyKpis: protectedProcedure
		.route({ method: "GET", path: "/me/kpis" })
		.input(myKpisInputSchema)
		.output(myKpisResponseSchema)
		.handler(({ input, context }) =>
			handle(() => profileService.getMyKpis(context.auth.userId, input)),
		),

	getMySummary: protectedProcedure
		.route({ method: "GET", path: "/me/kpis/summary" })
		.output(myKpisSummaryResponseSchema)
		.handler(({ context }) =>
			handle(() => profileService.getMySummary(context.auth.userId)),
		),

	getMyProfile: protectedProcedure
		.route({ method: "GET", path: "/me/profile" })
		.output(myProfileResponseSchema)
		.handler(({ context }) =>
			handle(() => profileService.getMyProfile(context.auth.userId)),
		),

	getPublicProfile: protectedProcedure
		.route({ method: "GET", path: "/members/{id}/profile" })
		.input(memberProfileInputSchema)
		.output(publicProfileResponseSchema)
		.handler(({ input }) =>
			handle(() => profileService.getPublicProfile(input.id)),
		),
};
