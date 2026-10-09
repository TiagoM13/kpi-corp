import { type MemberListItem, memberStatusOf } from "@/lib/members";
import { MemberActiveSwitch } from "./member-active-switch";
import {
	formatPoints,
	LevelBadge,
	MemberIdentity,
	PositionText,
	StatusBadge,
} from "./member-cells";

type MemberCardProps = {
	member: MemberListItem;
	isSelf: boolean;
	onSelect: (member: MemberListItem) => void;
	onToggleStatus: (member: MemberListItem) => void;
};

export function MemberCard({
	member,
	isSelf,
	onSelect,
	onToggleStatus,
}: MemberCardProps) {
	return (
		<li className="flex flex-col border-b last:border-b-0">
			<button
				type="button"
				onClick={() => onSelect(member)}
				aria-label={`Ver perfil de ${member.name}`}
				className="flex w-full flex-col gap-3 p-4 pb-3 text-left transition-colors hover:bg-muted/50"
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
					<LevelBadge level={member.level.level} />
					<StatusBadge status={memberStatusOf(member)} />
				</div>

				<div className="flex items-end justify-between gap-3">
					<span className="min-w-0 truncate text-fg-2 text-xs">
						<PositionText position={member.position} />
					</span>
					<span className="shrink-0 text-2xs text-fg-3 tabular-nums">
						{member.kpiCount} KPIs
					</span>
				</div>
			</button>

			<div className="flex items-center justify-between gap-3 px-4 pb-4">
				<span className="text-2xs text-fg-3">
					{member.active ? "Acesso liberado" : "Acesso bloqueado"}
				</span>
				<MemberActiveSwitch
					member={member}
					isSelf={isSelf}
					onRequestToggle={onToggleStatus}
				/>
			</div>
		</li>
	);
}
