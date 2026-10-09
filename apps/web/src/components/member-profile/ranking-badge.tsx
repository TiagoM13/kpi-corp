import { Badge } from "@kpi-corp/ui/components/badge";
import { cn } from "@kpi-corp/ui/lib/utils";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

type RankingBadgeProps = {
	position: number;
	change?: number | null;
};

function plural(total: number) {
	return `${total} ${total === 1 ? "posição" : "posições"}`;
}

function PositionChange({ change }: { change: number }) {
	const climbed = change > 0;
	const Icon = climbed ? ArrowUpIcon : ArrowDownIcon;

	return (
		<span
			className={cn(
				"inline-flex items-center font-semibold tabular-nums",
				climbed ? "text-good" : "text-bad",
			)}
		>
			<Icon aria-hidden className="size-3" />
			{Math.abs(change)}
			<span className="sr-only">
				{climbed ? "subiu" : "desceu"} {plural(Math.abs(change))}
			</span>
		</span>
	);
}

export function RankingBadge({ position, change }: RankingBadgeProps) {
	return (
		<Badge variant="outline" className="bg-bg-2 text-fg-1">
			<span aria-hidden className="size-1.5 rounded-full bg-primary" />
			<span>#{position} no ranking</span>
			{change ? <PositionChange change={change} /> : null}
		</Badge>
	);
}
