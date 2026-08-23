import { PlayIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/page-placeholder";

export function AdminMeetingPage() {
	return (
		<PagePlaceholder
			title="Modo reunião"
			description="Atribuição de KPIs em massa durante a reunião."
			icon={PlayIcon}
		/>
	);
}
