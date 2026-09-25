import { createFileRoute, redirect } from "@tanstack/react-router";

import {
	MEMBER_RANKING_PERIODS,
	PERIOD_SLUGS,
	periodFromSlug,
} from "@/lib/ranking";
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
		periodo:
			PERIOD_SLUGS[periodFromSlug(search.periodo, MEMBER_RANKING_PERIODS)],
	}),
	component: MemberRankingRoute,
});

function MemberRankingRoute() {
	const { periodo } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<MemberRankingPage
			period={periodFromSlug(periodo, MEMBER_RANKING_PERIODS)}
			onPeriodChange={(period) =>
				navigate({ search: { periodo: PERIOD_SLUGS[period] }, replace: true })
			}
		/>
	);
}
