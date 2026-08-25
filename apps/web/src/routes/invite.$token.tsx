import { createFileRoute } from "@tanstack/react-router";

import { validateInvite } from "@/lib/invite";
import { InvitePage } from "@/pages/invite";

export const Route = createFileRoute("/invite/$token")({
	loader: ({ params }) => validateInvite(params.token),
	component: InviteRoute,
});

function InviteRoute() {
	const { token } = Route.useParams();
	const validation = Route.useLoaderData();

	return <InvitePage token={token} validation={validation} />;
}
