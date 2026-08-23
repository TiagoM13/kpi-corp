import { UsersIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/page-placeholder";

export function AdminMembersPage() {
	return (
		<PagePlaceholder
			title="Membros"
			description="Pessoas do time, perfis e convites."
			icon={UsersIcon}
		/>
	);
}
