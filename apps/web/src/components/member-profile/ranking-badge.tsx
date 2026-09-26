import { Badge } from "@kpi-corp/ui/components/badge";

export function RankingBadge({ position }: { position: number }) {
	return (
		<Badge variant="outline" className="bg-bg-2 text-fg-1">
			<span aria-hidden className="size-1.5 rounded-full bg-primary" />
			<span>#{position} no ranking</span>
		</Badge>
	);
}
