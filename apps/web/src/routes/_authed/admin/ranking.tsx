import { createFileRoute } from "@tanstack/react-router";

import { AdminRankingPage } from "@/pages/admin/ranking";

export const Route = createFileRoute("/_authed/admin/ranking")({
	component: AdminRankingPage,
});
