import { Sparkline } from "@/components/sparkline";
import type { Member } from "@/mocks/members";
import {
	formatPoints,
	LevelBadge,
	MemberIdentity,
	StatusBadge,
	StreakBadge,
} from "./member-cells";

type MemberCardProps = {
	member: Member;
	onSelect: (member: Member) => void;
};

export function MemberCard({ member, onSelect }: MemberCardProps) {
	return (
		<li className="border-b last:border-b-0">
			<button
				type="button"
				onClick={() => onSelect(member)}
				aria-label={`Ver perfil de ${member.name}`}
				className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-muted/50"
			>
				<div className="flex items-start justify-between gap-3">
					<MemberIdentity member={member} />
					<div className="flex shrink-0 flex-col items-end leading-tight">
						<span className="font-semibold text-sm tabular-nums">
							{formatPoints(member.points)}
						</span>
						<span className="text-2xs text-fg-3">pontos</span>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-1.5">
					<LevelBadge points={member.points} />
					<StreakBadge streak={member.streak} />
					<StatusBadge stagnantDays={member.stagnantDays} />
				</div>

				<div className="flex items-end justify-between gap-3">
					<span className="truncate text-fg-2 text-xs">{member.position}</span>
					<Sparkline
						data={member.trend}
						label={`Tendência de ${member.name} nos últimos 7 dias`}
						className={member.stagnantDays ? "text-warn" : undefined}
					/>
				</div>
			</button>
		</li>
	);
}
