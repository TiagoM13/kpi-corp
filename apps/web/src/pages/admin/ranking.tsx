import { TrophyIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/page-placeholder";

export function AdminRankingPage() {
	return (
		<PagePlaceholder
			title="Ranking"
			description="Classificação por pontos acumulados."
			icon={TrophyIcon}
		/>
	);
}
