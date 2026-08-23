import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/_authed")({
	beforeLoad: () => {
		const session = getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
		// Fica disponivel para as rotas filhas via useRouteContext.
		return { session };
	},
	component: AuthedLayout,
});

function AuthedLayout() {
	const { session } = Route.useRouteContext();

	return (
		<AppShell session={session}>
			<Outlet />
		</AppShell>
	);
}
