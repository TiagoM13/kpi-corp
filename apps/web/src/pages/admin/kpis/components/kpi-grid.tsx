import { cn } from "@kpi-corp/ui/lib/utils";
import { KpiTile } from "@/components/kpi-tile";
import type { Kpi } from "@/mocks/kpis";

type KpiGridProps = {
	kpis: Kpi[];
	className?: string;
};

export function KpiGrid({ kpis, className }: KpiGridProps) {
	return (
		<ul className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", className)}>
			{kpis.map((kpi) => (
				<li key={kpi.id}>
					<KpiTile kpi={kpi} />
				</li>
			))}
		</ul>
	);
}
