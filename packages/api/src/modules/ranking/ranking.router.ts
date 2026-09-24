import { protectedProcedure } from "../../index";
import { handle } from "../../shared/errors/handle";
import { rankingInputSchema, rankingResponseSchema } from "./ranking.schema";
import { rankingService } from "./ranking.service";

export const rankingRouter = {
	get: protectedProcedure
		.route({ method: "GET", path: "/ranking" })
		.input(rankingInputSchema)
		.output(rankingResponseSchema)
		.handler(({ input, context }) =>
			handle(() => rankingService.getRanking(input.period, context.auth)),
		),
};
