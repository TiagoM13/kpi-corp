import { createFileRoute, redirect } from "@tanstack/react-router";

import { getSession, homeRouteFor } from "@/lib/auth";

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		const session = getSession();
		throw redirect({ to: session ? homeRouteFor(session.role) : "/login" });
	},
});
