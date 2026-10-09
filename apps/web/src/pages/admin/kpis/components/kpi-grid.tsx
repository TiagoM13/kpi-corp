import { cn } from "@kpi-corp/ui/lib/utils";
import { KpiTile } from "@/components/kpi-tile";
import type { Kpi } from "@/mocks/kpis";
import { KpiToggleButton } from "./kpi-toggle-button";

type KpiGridProps = {
	kpis: Kpi[];
	onEdit: (kpi: Kpi) => void;
	className?: string;
};

export function KpiGrid({ kpis, onEdit, className }: KpiGridProps) {
	return (
		<ul className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", className)}>
			{kpis.map((kpi) => (
				<li key={kpi.id}>
					<KpiTile
						kpi={kpi}
						onOpen={() => onEdit(kpi)}
						actions={<KpiToggleButton kpi={kpi} className="relative z-20" />}
					/>
				</li>
			))}
		</ul>
	);
}
