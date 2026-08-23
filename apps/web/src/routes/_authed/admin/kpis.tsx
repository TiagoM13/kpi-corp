import { createFileRoute } from "@tanstack/react-router";

import { AdminKpisPage } from "@/pages/admin/kpis";

export const Route = createFileRoute("/_authed/admin/kpis")({
	component: AdminKpisPage,
});
