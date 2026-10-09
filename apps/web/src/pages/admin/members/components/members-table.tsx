import { Button } from "@kpi-corp/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@kpi-corp/ui/components/table";
import { cn } from "@kpi-corp/ui/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import { type MemberListItem, memberStatusOf } from "@/lib/members";
import { MemberActiveSwitch } from "./member-active-switch";
import {
	formatPoints,
	LevelBadge,
	MemberIdentity,
	PositionText,
	StatusBadge,
} from "./member-cells";

const HEAD =
	"h-9 px-4 font-medium text-2xs text-fg-3 uppercase tracking-widest";
const CELL = "px-4 py-3";

const COLUMNS = {
	member: "min-w-56",
	position: "hidden min-w-32 lg:table-cell",
	points: "w-28 pr-8 text-right tabular-nums",
	level: "hidden w-24 lg:table-cell",
	kpis: "hidden w-20 pr-8 text-right tabular-nums xl:table-cell",
	status: "w-36",
	access: "w-20",
	actions: "w-14 text-right",
} as const;

type MembersTableProps = {
	members: MemberListItem[];
	currentUserId?: string;
	onSelect: (member: MemberListItem) => void;
	onToggleStatus: (member: MemberListItem) => void;
};

export function MembersTable({
	members,
	currentUserId,
	onSelect,
	onToggleStatus,
}: MembersTableProps) {
	return (
		<Table className="text-sm">
			<TableHeader>
				<TableRow className="hover:bg-transparent">
					<TableHead className={cn(HEAD, COLUMNS.member)}>Membro</TableHead>
					<TableHead className={cn(HEAD, COLUMNS.position)}>Cargo</TableHead>
					<TableHead className={cn(HEAD, COLUMNS.points)}>Pontos</TableHead>
					<TableHead className={cn(HEAD, COLUMNS.level)}>Nível</TableHead>
					<TableHead className={cn(HEAD, COLUMNS.kpis)}>KPIs</TableHead>
					<TableHead className={cn(HEAD, COLUMNS.status)}>Status</TableHead>
					<TableHead className={cn(HEAD, COLUMNS.access)}>Acesso</TableHead>
					<TableHead className={cn(HEAD, COLUMNS.actions)}>
						<span className="sr-only">Ações</span>
					</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{members.map((member) => (
					<TableRow
						key={member.id}
						onClick={() => onSelect(member)}
						className="cursor-pointer"
					>
						<TableCell className={cn(CELL, COLUMNS.member)}>
							<MemberIdentity member={member} />
						</TableCell>

						<TableCell className={cn(CELL, COLUMNS.position, "text-fg-1")}>
							<PositionText position={member.position} />
						</TableCell>

						<TableCell className={cn(CELL, COLUMNS.points, "font-semibold")}>
							{formatPoints(member.points)}
						</TableCell>

						<TableCell className={cn(CELL, COLUMNS.level)}>
							<LevelBadge level={member.level.level} />
						</TableCell>

						<TableCell className={cn(CELL, COLUMNS.kpis, "text-fg-2")}>
							{member.kpiCount}
						</TableCell>

						<TableCell className={cn(CELL, COLUMNS.status)}>
							<StatusBadge status={memberStatusOf(member)} />
						</TableCell>

						<TableCell className={cn(CELL, COLUMNS.access)}>
							<MemberActiveSwitch
								member={member}
								isSelf={member.id === currentUserId}
								onRequestToggle={onToggleStatus}
							/>
						</TableCell>

						<TableCell className={cn(CELL, COLUMNS.actions)}>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label={`Ver perfil de ${member.name}`}
								onClick={(event) => {
									event.stopPropagation();
									onSelect(member);
								}}
							>
								<ArrowRightIcon />
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
