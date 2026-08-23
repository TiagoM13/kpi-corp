import { createFileRoute, redirect } from "@tanstack/react-router";

import { MemberRankingPage } from "@/pages/member/ranking";

export const Route = createFileRoute("/_authed/ranking")({
	beforeLoad: ({ context }) => {
		if (context.session.role === "ADMIN") {
			throw redirect({ to: "/admin/ranking" });
		}
	},
	component: MemberRankingPage,
});
