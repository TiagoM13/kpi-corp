import { Badge } from "@kpi-corp/ui/components/badge";
import { UserAvatar } from "@/components/user-avatar";
import type { MemberListItem, MemberStatus } from "@/lib/members";

const pointsFormat = new Intl.NumberFormat("pt-BR");

export function formatPoints(points: number) {
	return pointsFormat.format(points);
}

type MemberIdentityProps = {
	member: Pick<MemberListItem, "name" | "email">;
};

export function MemberIdentity({ member }: MemberIdentityProps) {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<UserAvatar name={member.name} className="size-8" />
			<div className="flex min-w-0 flex-col leading-tight">
				<span className="truncate font-medium text-sm">{member.name}</span>
				<span className="truncate text-2xs text-fg-3">{member.email}</span>
			</div>
		</div>
	);
}

export function LevelBadge({ level }: { level: number }) {
	return (
		<Badge
			variant="outline"
			className="bg-bg-2 text-fg-1"
			aria-label={`Nível ${level}`}
		>
			<span aria-hidden className="size-1.5 rounded-full bg-primary" />
			nv {level}
		</Badge>
	);
}

export function StatusBadge({ status }: { status: MemberStatus }) {
	if (status.kind === "INACTIVE") {
		return (
			<Badge variant="outline" className="bg-bg-2 text-fg-3">
				<span aria-hidden className="size-1.5 rounded-full bg-current" />
				Inativo
			</Badge>
		);
	}

	if (status.kind === "STAGNANT") {
		return (
			<Badge variant="outline" className="border-warn/25 bg-warn/10 text-warn">
				<span aria-hidden className="size-1.5 rounded-full bg-current" />
				{status.days}d sem KPI
			</Badge>
		);
	}

	return (
		<Badge variant="outline" className="border-good/25 bg-good/10 text-good">
			<span aria-hidden className="size-1.5 rounded-full bg-current" />
			Ativo
		</Badge>
	);
}

export function PositionText({ position }: { position: string | null }) {
	if (!position) {
		return <span className="text-fg-3">—</span>;
	}

	return <>{position}</>;
}
