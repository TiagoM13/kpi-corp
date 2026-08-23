import { LayoutDashboardIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/page-placeholder";

export function MemberDashboardPage() {
	return (
		<PagePlaceholder
			title="Meu painel"
			description="Seus pontos, nível e conquistas."
			icon={LayoutDashboardIcon}
		/>
	);
}
