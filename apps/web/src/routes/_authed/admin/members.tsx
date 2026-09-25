import { createFileRoute } from "@tanstack/react-router";

import { AdminMembersPage } from "@/pages/admin/members";

export const Route = createFileRoute("/_authed/admin/members")({
	component: AdminMembersRoute,
});

function AdminMembersRoute() {
	const { session } = Route.useRouteContext();

	return <AdminMembersPage currentUserId={session.userId} />;
}
