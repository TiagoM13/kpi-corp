import { Button } from "@kpi-corp/ui/components/button";
import { cn } from "@kpi-corp/ui/lib/utils";
import { toast } from "sonner";
import type { Kpi } from "@/mocks/kpis";
import { useToggleKpi } from "../use-kpis";

export function KpiToggleButton({
	kpi,
	className,
}: {
	kpi: Kpi;
	className?: string;
}) {
	const toggleKpi = useToggleKpi();

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className={cn("text-fg-2", className)}
			disabled={toggleKpi.isPending}
			aria-label={`${kpi.active ? "Inativar" : "Ativar"} ${kpi.name}`}
			onClick={(event) => {
				event.stopPropagation();
				toggleKpi.mutate(
					{ id: kpi.id, active: !kpi.active },
					{
						onSuccess: () =>
							toast.success(kpi.active ? "KPI inativado" : "KPI reativado"),
						onError: () =>
							toast.error("Não deu para mudar o status do KPI. Tente de novo."),
					},
				);
			}}
		>
			{kpi.active ? "Inativar" : "Ativar"}
		</Button>
	);
}
