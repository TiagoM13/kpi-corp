import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/_focus")({
	beforeLoad: () => {
		const session = getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
		return { session };
	},
	component: Outlet,
});
