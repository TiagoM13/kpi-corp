import { createFileRoute } from "@tanstack/react-router";

import { AdminMeetingPage } from "@/pages/admin/meeting";

export const Route = createFileRoute("/_authed/admin/meeting")({
	component: AdminMeetingPage,
});
