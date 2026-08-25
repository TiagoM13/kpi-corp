import { Badge } from "@kpi-corp/ui/components/badge";
import { UserAvatar } from "@/components/user-avatar";
import { levelOf } from "@/lib/member-stats";
import type { Member } from "@/mocks/members";

const pointsFormat = new Intl.NumberFormat("pt-BR");

export function formatPoints(points: number) {
	return pointsFormat.format(points);
}

export function MemberIdentity({ member }: { member: Member }) {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<UserAvatar name={member.name} hue={member.hue} className="size-8" />
			<div className="flex min-w-0 flex-col leading-tight">
				<span className="truncate font-medium text-sm">{member.name}</span>
				<span className="truncate text-2xs text-fg-3">{member.email}</span>
			</div>
		</div>
	);
}

export function LevelBadge({ points }: { points: number }) {
	const level = levelOf(points);

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

export function StreakBadge({ streak }: { streak: number }) {
	if (streak === 0) return null;

	return (
		<Badge
			variant="outline"
			className="border-warn/25 bg-warn/10 text-warn"
			aria-label={`Sequência de ${streak} dias`}
		>
			<span aria-hidden>🔥</span>
			{streak}
		</Badge>
	);
}

export function StatusBadge({ stagnantDays }: { stagnantDays?: number }) {
	if (stagnantDays === undefined) {
		return (
			<Badge variant="outline" className="border-good/25 bg-good/10 text-good">
				<span aria-hidden className="size-1.5 rounded-full bg-current" />
				Ativa
			</Badge>
		);
	}

	return (
		<Badge variant="outline" className="border-warn/25 bg-warn/10 text-warn">
			<span aria-hidden className="size-1.5 rounded-full bg-current" />
			{stagnantDays}d sem KPI
		</Badge>
	);
}
