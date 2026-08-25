import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import {
	CheckCircleIcon,
	ClockAlertIcon,
	LinkIcon,
	type LucideIcon,
} from "lucide-react";

import { INVITE_ERROR, type InviteStatus } from "@/lib/invite";

type RefusedStatus = Exclude<InviteStatus, "VALID">;

const ICON: Record<RefusedStatus, LucideIcon> = {
	EXPIRED: ClockAlertIcon,
	USED: CheckCircleIcon,
	INVALID: LinkIcon,
};

export function InviteError({ status }: { status: RefusedStatus }) {
	const Icon = ICON[status];
	const { title, description } = INVITE_ERROR[status];

	return (
		<section className="grid place-items-center p-6 lg:p-10">
			<Empty className="w-full max-w-[380px] border">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Icon />
					</EmptyMedia>
					<EmptyTitle>{title}</EmptyTitle>
					<EmptyDescription>{description}</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<a href="/login" className="text-[13px] text-primary hover:underline">
						Voltar para o login
					</a>
				</EmptyContent>
			</Empty>
		</section>
	);
}
