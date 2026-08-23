import { TargetIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/page-placeholder";

export function AdminKpisPage() {
	return (
		<PagePlaceholder
			title="Banco de KPIs"
			description="Cadastro dos KPIs de presença, comportamento, desempenho e iniciativa."
			icon={TargetIcon}
		/>
	);
}
