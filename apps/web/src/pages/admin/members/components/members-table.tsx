import { Button } from "@kpi-corp/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@kpi-corp/ui/components/table";
import { ArrowRightIcon } from "lucide-react";
import { Sparkline } from "@/components/sparkline";
import type { Member } from "@/mocks/members";
import {
	formatPoints,
	LevelBadge,
	MemberIdentity,
	StatusBadge,
	StreakBadge,
} from "./member-cells";

type MembersTableProps = {
	members: Member[];
	onSelect: (member: Member) => void;
};

export function MembersTable({ members, onSelect }: MembersTableProps) {
	return (
		<Table className="text-sm">
			<TableHeader className="[&_th]:h-9 [&_th]:px-3 [&_th]:font-medium [&_th]:text-2xs [&_th]:text-fg-3 [&_th]:uppercase [&_th]:tracking-widest">
				<TableRow className="hover:bg-transparent">
					<TableHead>Membro</TableHead>
					<TableHead className="hidden lg:table-cell">Cargo</TableHead>
					<TableHead className="text-right">Pontos</TableHead>
					<TableHead className="hidden lg:table-cell">Nível</TableHead>
					<TableHead className="hidden xl:table-cell">Sequência</TableHead>
					<TableHead className="hidden xl:table-cell">7 dias</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>
						<span className="sr-only">Ações</span>
					</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody className="[&_td]:px-3 [&_td]:py-3">
				{members.map((member) => (
					<TableRow
						key={member.id}
						onClick={() => onSelect(member)}
						className="cursor-pointer"
					>
						<TableCell>
							<MemberIdentity member={member} />
						</TableCell>

						<TableCell className="hidden text-fg-1 lg:table-cell">
							{member.position}
						</TableCell>

						<TableCell className="text-right font-semibold tabular-nums">
							{formatPoints(member.points)}
						</TableCell>

						<TableCell className="hidden lg:table-cell">
							<LevelBadge points={member.points} />
						</TableCell>

						<TableCell className="hidden xl:table-cell">
							{member.streak > 0 ? (
								<StreakBadge streak={member.streak} />
							) : (
								<span className="text-fg-3">—</span>
							)}
						</TableCell>

						<TableCell className="hidden xl:table-cell">
							<Sparkline
								data={member.trend}
								label={`Tendência de ${member.name} nos últimos 7 dias`}
								className={member.stagnantDays ? "text-warn" : undefined}
							/>
						</TableCell>

						<TableCell>
							<StatusBadge stagnantDays={member.stagnantDays} />
						</TableCell>

						<TableCell className="text-right">
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
