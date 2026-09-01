import { createFileRoute } from "@tanstack/react-router";

import { AdminDashboardPage } from "@/pages/admin/dashboard";

export const Route = createFileRoute("/_authed/admin/")({
	component: AdminDashboardRoute,
});

function AdminDashboardRoute() {
	const { session } = Route.useRouteContext();

	return <AdminDashboardPage name={session.name} />;
}
