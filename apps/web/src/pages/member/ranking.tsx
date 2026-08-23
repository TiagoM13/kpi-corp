import { TrophyIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/page-placeholder";

export function MemberRankingPage() {
	return (
		<PagePlaceholder
			title="Ranking"
			description="Classificação por pontos acumulados."
			icon={TrophyIcon}
		/>
	);
}
