import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { AdminMeetingPage } from "@/pages/admin/meeting";

export const Route = createFileRoute("/_focus/admin/meeting")({
	beforeLoad: ({ context }) => {
		if (context.session.role !== "ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: MeetingRoute,
});

function MeetingRoute() {
	const navigate = useNavigate();

	return <AdminMeetingPage onExit={() => navigate({ to: "/admin" })} />;
}
