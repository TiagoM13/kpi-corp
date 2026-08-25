import { BrandPanel } from "@/components/brand-panel";
import type { InviteValidation } from "@/lib/invite";

import { InviteError } from "./components/invite-error";
import { InviteForm } from "./components/invite-form";

export function InvitePage({
	token,
	validation,
}: {
	token: string;
	validation: InviteValidation;
}) {
	return (
		<div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
			<BrandPanel />
			{validation.status === "VALID" ? (
				<InviteForm token={token} email={validation.email} />
			) : (
				<InviteError status={validation.status} />
			)}
		</div>
	);
}
