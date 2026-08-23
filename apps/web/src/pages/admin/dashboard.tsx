import { LayoutDashboardIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/page-placeholder";

export function AdminDashboardPage() {
	return (
		<PagePlaceholder
			title="Painel"
			description="Visão geral do engajamento do time."
			icon={LayoutDashboardIcon}
		/>
	);
}
