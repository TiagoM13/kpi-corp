import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { Link } from "@tanstack/react-router";
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
			<Empty className="w-full max-w-sm border">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Icon />
					</EmptyMedia>
					<EmptyTitle>{title}</EmptyTitle>
					<EmptyDescription>{description}</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Link to="/login" className="text-primary text-sm hover:underline">
						Voltar para o login
					</Link>
				</EmptyContent>
			</Empty>
		</section>
	);
}
