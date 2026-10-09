import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSession } from "@/lib/auth";
import { useRevalidatedSession } from "@/lib/use-revalidated-session";

export const Route = createFileRoute("/_focus")({
	beforeLoad: () => {
		const session = getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
		return { session };
	},
	component: FocusLayout,
});

function FocusLayout() {
	useRevalidatedSession(Route.useRouteContext().session);

	return <Outlet />;
}
