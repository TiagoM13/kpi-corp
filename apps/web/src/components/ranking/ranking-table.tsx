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
import type { TeamRankingEntry } from "@/lib/ranking";

type RankedMember = TeamRankingEntry["member"];

const pointsFormat = new Intl.NumberFormat("pt-BR");

const HEAD =
	"h-9 px-4 font-medium text-2xs text-fg-3 uppercase tracking-widest";
const CELL = "px-4 py-3";

const COLUMNS = {
	place: "w-16 tabular-nums",
	member: "min-w-48",
	position: "hidden min-w-32 md:table-cell",
	kpis: "hidden w-20 pr-8 text-right tabular-nums sm:table-cell",
	points: "w-28 text-right tabular-nums",
	change: "hidden w-28 text-right sm:table-cell",
} as const;

function RankChange({ change }: { change: number | null }) {
	if (change === null || change === 0) {
		return (
			<span className="text-fg-3">
				<span aria-hidden>—</span>
				<span className="sr-only">
					{change === null
						? "Sem comparação com o período anterior"
						: "Sem mudança de posição"}
				</span>
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
	entries: TeamRankingEntry[];
	onOpenMember?: (member: RankedMember) => void;
};

export function RankingTable({ entries, onOpenMember }: RankingTableProps) {
	return (
		<Table className="text-sm">
			<TableHeader>
				<TableRow className="hover:bg-transparent">
					<TableHead className={cn(HEAD, COLUMNS.place)}>#</TableHead>
					<TableHead className={cn(HEAD, COLUMNS.member)}>Membro</TableHead>
					<TableHead className={cn(HEAD, COLUMNS.position)}>Cargo</TableHead>
					<TableHead className={cn(HEAD, COLUMNS.kpis)}>KPIs</TableHead>
					<TableHead className={cn(HEAD, COLUMNS.points)}>Pontos</TableHead>
					<TableHead className={cn(HEAD, COLUMNS.change)}>Mudança</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{entries.map((entry) => (
					<TableRow
						key={entry.member.id}
						onClick={
							onOpenMember ? () => onOpenMember(entry.member) : undefined
						}
						className={cn(
							onOpenMember && "cursor-pointer",
							entry.isMe && "bg-primary-soft hover:bg-primary-soft",
						)}
					>
						<TableCell className={cn(CELL, COLUMNS.place, "text-fg-3")}>
							{String(entry.position).padStart(2, "0")}
						</TableCell>

						<TableCell className={cn(CELL, COLUMNS.member)}>
							<div className="flex min-w-0 items-center gap-3">
								<UserAvatar name={entry.member.name} />
								<RankingName entry={entry} onOpenMember={onOpenMember} />
								{entry.isMe && (
									<Badge variant="outline" className="bg-bg-2 text-fg-1">
										você
									</Badge>
								)}
							</div>
						</TableCell>

						<TableCell className={cn(CELL, COLUMNS.position, "text-fg-2")}>
							{entry.member.position ?? "—"}
						</TableCell>

						<TableCell className={cn(CELL, COLUMNS.kpis, "text-fg-2")}>
							{entry.kpiCount}
						</TableCell>

						<TableCell className={cn(CELL, COLUMNS.points, "font-semibold")}>
							{pointsFormat.format(entry.points)}
						</TableCell>

						<TableCell className={cn(CELL, COLUMNS.change)}>
							<RankChange change={entry.change} />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function RankingName({
	entry,
	onOpenMember,
}: {
	entry: TeamRankingEntry;
	onOpenMember?: (member: RankedMember) => void;
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
