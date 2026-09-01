import { createFileRoute, redirect } from "@tanstack/react-router";

import { PERIOD_SLUGS, periodFromSlug } from "@/lib/ranking";
import { MemberRankingPage } from "@/pages/member/ranking";

export const Route = createFileRoute("/_authed/ranking")({
	beforeLoad: ({ context }) => {
		if (context.session.role === "ADMIN") {
			throw redirect({
				to: "/admin/ranking",
				search: { periodo: PERIOD_SLUGS.all },
			});
		}
	},
	validateSearch: (search: Record<string, unknown>) => ({
		periodo: PERIOD_SLUGS[periodFromSlug(search.periodo)],
	}),
	component: MemberRankingRoute,
});

function MemberRankingRoute() {
	const { session } = Route.useRouteContext();
	const { periodo } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<MemberRankingPage
			memberId={session.userId}
			period={periodFromSlug(periodo)}
			onPeriodChange={(period) =>
				navigate({ search: { periodo: PERIOD_SLUGS[period] }, replace: true })
			}
		/>
	);
}
