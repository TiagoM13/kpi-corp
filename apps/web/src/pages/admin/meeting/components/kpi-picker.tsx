import { cn } from "@kpi-corp/ui/lib/utils";
import { CATEGORY_BY_ID, type Kpi } from "@/mocks/kpis";

type KpiPickerProps = {
	kpis: Kpi[];
	selectedKpiId: string | null;
	onSelect: (kpiId: string | null) => void;
};

export function KpiPicker({ kpis, selectedKpiId, onSelect }: KpiPickerProps) {
	return (
		<section
			aria-label="KPIs disponíveis"
			className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4"
		>
			<h2 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
				Escolha o KPI
			</h2>

			<ul className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
				{kpis.map((kpi) => {
					const category = CATEGORY_BY_ID.get(kpi.category);
					const selected = kpi.id === selectedKpiId;

					return (
						<li key={kpi.id} className="shrink-0 lg:shrink">
							<button
								type="button"
								aria-pressed={selected}
								onClick={() => onSelect(selected ? null : kpi.id)}
								className={cn(
									"flex w-52 items-center gap-3 rounded-md border p-3 text-left transition-colors lg:w-full",
									selected
										? "border-primary bg-primary-soft"
										: "border-border bg-bg-2 hover:bg-muted/50",
								)}
							>
								<span
									aria-hidden
									className="size-1.5 shrink-0 rounded-full"
									style={{ backgroundColor: category?.color }}
								/>

								<span className="min-w-0 flex-1 truncate font-medium text-xs">
									{kpi.name}
								</span>

								<span
									className="shrink-0 font-bold text-sm tabular-nums"
									style={{ color: category?.color }}
								>
									+{kpi.points}
								</span>
							</button>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
