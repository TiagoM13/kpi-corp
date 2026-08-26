import { Badge } from "@kpi-corp/ui/components/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@kpi-corp/ui/components/table";
import { cn } from "@kpi-corp/ui/lib/utils";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { levelOf } from "@/lib/member-stats";
import type { RankingEntry } from "@/lib/ranking";
import type { Member } from "@/mocks/members";

const pointsFormat = new Intl.NumberFormat("pt-BR");

function RankChange({ change }: { change: number }) {
	if (change === 0) {
		return (
			<span className="text-fg-3">
				<span aria-hidden>—</span>
				<span className="sr-only">Sem mudança de posição</span>
			</span>
		);
	}

	const climbed = change > 0;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 tabular-nums",
				climbed ? "text-good" : "text-bad",
			)}
		>
			{climbed ? (
				<ArrowUpIcon aria-hidden className="size-3" />
			) : (
				<ArrowDownIcon aria-hidden className="size-3" />
			)}
			{Math.abs(change)}
			<span className="sr-only">
				{climbed ? "posições ganhas" : "posições perdidas"}
			</span>
		</span>
	);
}

type RankingTableProps = {
	entries: RankingEntry[];
	highlightMemberId?: string;
	onOpenMember?: (member: Member) => void;
};

export function RankingTable({
	entries,
	highlightMemberId,
	onOpenMember,
}: RankingTableProps) {
	return (
		<Table className="text-sm">
			<TableHeader className="[&_th]:h-9 [&_th]:px-3 [&_th]:font-medium [&_th]:text-2xs [&_th]:text-fg-3 [&_th]:uppercase [&_th]:tracking-widest">
				<TableRow className="hover:bg-transparent">
					<TableHead className="w-14">#</TableHead>
					<TableHead>Membro</TableHead>
					<TableHead className="hidden md:table-cell">Cargo</TableHead>
					<TableHead className="hidden sm:table-cell">Nível</TableHead>
					<TableHead className="text-right">Pontos</TableHead>
					<TableHead className="hidden text-right sm:table-cell">
						Mudança
					</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody className="[&_td]:px-3 [&_td]:py-3">
				{entries.map((entry) => {
					const isSelf = entry.member.id === highlightMemberId;

					return (
						<TableRow
							key={entry.member.id}
							onClick={
								onOpenMember ? () => onOpenMember(entry.member) : undefined
							}
							className={cn(
								onOpenMember && "cursor-pointer",
								isSelf && "bg-primary-soft hover:bg-primary-soft",
							)}
						>
							<TableCell className="text-fg-3 tabular-nums">
								{String(entry.place).padStart(2, "0")}
							</TableCell>

							<TableCell>
								<div className="flex min-w-0 items-center gap-3">
									<UserAvatar name={entry.member.name} hue={entry.member.hue} />
									<RankingName entry={entry} onOpenMember={onOpenMember} />
									{isSelf && (
										<Badge variant="outline" className="bg-bg-2 text-fg-1">
											você
										</Badge>
									)}
								</div>
							</TableCell>

							<TableCell className="hidden text-fg-2 md:table-cell">
								{entry.member.position}
							</TableCell>

							<TableCell className="hidden sm:table-cell">
								<Badge variant="outline" className="bg-bg-2 text-fg-1">
									<span
										aria-hidden
										className="size-1.5 rounded-full bg-primary"
									/>
									nv {levelOf(entry.member.points)}
								</Badge>
							</TableCell>

							<TableCell className="text-right font-semibold tabular-nums">
								{pointsFormat.format(entry.points)}
							</TableCell>

							<TableCell className="hidden text-right sm:table-cell">
								<RankChange change={entry.change} />
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

function RankingName({
	entry,
	onOpenMember,
}: {
	entry: RankingEntry;
	onOpenMember?: (member: Member) => void;
}) {
	if (!onOpenMember) {
		return <span className="truncate font-medium">{entry.member.name}</span>;
	}

	return (
		<button
			type="button"
			onClick={(event) => {
				event.stopPropagation();
				onOpenMember(entry.member);
			}}
			aria-label={`Ver perfil de ${entry.member.name}`}
			className="truncate rounded-xs text-left font-medium hover:underline focus-visible:ring-1 focus-visible:ring-ring/50"
		>
			{entry.member.name}
		</button>
	);
}
