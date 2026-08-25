import { Sparkline } from "@/components/sparkline";
import type { Member } from "@/mocks/members";
import {
	formatPoints,
	LevelBadge,
	MemberIdentity,
	StatusBadge,
	StreakBadge,
} from "./member-cells";

export function MemberCard({ member }: { member: Member }) {
	return (
		<li className="flex flex-col gap-3 border-b p-4 last:border-b-0">
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
		</li>
	);
}
