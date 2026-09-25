import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { useRevalidatedSession } from "@/lib/use-revalidated-session";

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
	const session = useRevalidatedSession(Route.useRouteContext().session);

	return (
		<AppShell session={session}>
			<Outlet />
		</AppShell>
	);
}
