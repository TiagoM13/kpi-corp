import { Button } from "@kpi-corp/ui/components/button";
import { cn } from "@kpi-corp/ui/lib/utils";
import { toast } from "sonner";
import { selectToggleKpi, useKpiStore } from "@/lib/kpi-store";
import type { Kpi } from "@/mocks/kpis";

export function KpiToggleButton({
	kpi,
	className,
}: {
	kpi: Kpi;
	className?: string;
}) {
	const toggleKpi = useKpiStore(selectToggleKpi);

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className={cn("text-fg-2", className)}
			onClick={(event) => {
				event.stopPropagation();
				toggleKpi(kpi.id);
				toast.success(kpi.active ? "KPI inativado" : "KPI reativado");
			}}
		>
			{kpi.active ? "Inativar" : "Ativar"}
		</Button>
	);
}
