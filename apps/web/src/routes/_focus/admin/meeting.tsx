import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { AdminMeetingPage } from "@/pages/admin/meeting";

export const Route = createFileRoute("/_focus/admin/meeting")({
	beforeLoad: ({ context }) => {
		if (context.session.role !== "ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	validateSearch: (search: Record<string, unknown>): { reuniao?: string } =>
		typeof search.reuniao === "string" && search.reuniao !== ""
			? { reuniao: search.reuniao }
			: {},
	component: MeetingRoute,
});

function MeetingRoute() {
	const navigate = useNavigate();
	const { reuniao } = Route.useSearch();

	return (
		<AdminMeetingPage
			meetingId={reuniao}
			onMeetingChange={(meetingId) =>
				navigate({
					to: "/admin/meeting",
					search: meetingId ? { reuniao: meetingId } : {},
					replace: true,
				})
			}
			onExit={() => navigate({ to: "/admin" })}
		/>
	);
}
