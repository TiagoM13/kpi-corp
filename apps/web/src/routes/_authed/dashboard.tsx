import { createFileRoute, redirect } from "@tanstack/react-router";

import { MemberDashboardPage } from "@/pages/member/dashboard";

export const Route = createFileRoute("/_authed/dashboard")({
	beforeLoad: ({ context }) => {
		if (context.session.role === "ADMIN") {
			throw redirect({ to: "/admin" });
		}
	},
	component: MemberDashboardRoute,
});

function MemberDashboardRoute() {
	const { session } = Route.useRouteContext();

	return <MemberDashboardPage name={session.name} />;
}
