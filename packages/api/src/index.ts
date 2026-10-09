import { ORPCError, os } from "@orpc/server";

import type { Context } from "./shared/context";

export const o = os.$context<Context>();

export const publicProcedure = o;

export const protectedProcedure = o.use(({ context, next }) => {
	if (!context.auth) {
		throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
	}

	return next({
		context: {
			...context,
			auth: context.auth,
		},
	});
});

export const adminProcedure = protectedProcedure.use(({ context, next }) => {
	if (context.auth.role !== "ADMIN") {
		throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
	}

	return next({
		context: {
			...context,
			auth: context.auth,
		},
	});
});
