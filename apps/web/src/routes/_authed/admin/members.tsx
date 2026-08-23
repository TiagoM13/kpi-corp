import { createFileRoute } from "@tanstack/react-router";

import { AdminMembersPage } from "@/pages/admin/members";

export const Route = createFileRoute("/_authed/admin/members")({
	component: AdminMembersPage,
});
