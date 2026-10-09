import { protectedProcedure, publicProcedure } from "../../index";
import { handle } from "../../shared/errors/handle";
import {
	loginInputSchema,
	loginResponseSchema,
	logoutInputSchema,
	logoutResponseSchema,
	meResponseSchema,
	refreshInputSchema,
	refreshResponseSchema,
	registerInputSchema,
	registerResponseSchema,
	validateInviteInputSchema,
	validateInviteResponseSchema,
} from "./auth.schema";
import { authService } from "./auth.service";

export const authRouter = {
	login: publicProcedure
		.route({ method: "POST" })
		.input(loginInputSchema)
		.output(loginResponseSchema)
		.handler(({ input }) => handle(() => authService.login(input))),

	me: protectedProcedure
		.route({ method: "GET" })
		.output(meResponseSchema)
		.handler(({ context }) =>
			handle(() => authService.getAuthenticatedUser(context.auth.userId)),
		),

	refresh: publicProcedure
		.route({ method: "POST" })
		.input(refreshInputSchema)
		.output(refreshResponseSchema)
		.handler(({ input }) =>
			handle(() => authService.refreshSession(input.refreshToken)),
		),

	logout: publicProcedure
		.route({ method: "POST" })
		.input(logoutInputSchema)
		.output(logoutResponseSchema)
		.handler(({ input }) =>
			handle(() => authService.logout(input.refreshToken)),
		),

	validateInvite: publicProcedure
		.route({ method: "POST" })
		.input(validateInviteInputSchema)
		.output(validateInviteResponseSchema)
		.handler(({ input }) =>
			handle(() => authService.validateInvitation(input.token)),
		),

	register: publicProcedure
		.route({ method: "POST" })
		.input(registerInputSchema)
		.output(registerResponseSchema)
		.handler(({ input }) => handle(() => authService.register(input))),
};
