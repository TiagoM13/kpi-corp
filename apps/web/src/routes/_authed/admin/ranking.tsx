import { createFileRoute } from "@tanstack/react-router";

import { PERIOD_SLUGS, periodFromSlug } from "@/lib/ranking";
import { AdminRankingPage } from "@/pages/admin/ranking";

export const Route = createFileRoute("/_authed/admin/ranking")({
	validateSearch: (search: Record<string, unknown>) => ({
		periodo: PERIOD_SLUGS[periodFromSlug(search.periodo)],
	}),
	component: AdminRankingRoute,
});

function AdminRankingRoute() {
	const { session } = Route.useRouteContext();
	const { periodo } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<AdminRankingPage
			memberId={session.userId}
			period={periodFromSlug(periodo)}
			onPeriodChange={(period) =>
				navigate({ search: { periodo: PERIOD_SLUGS[period] }, replace: true })
			}
		/>
	);
}
