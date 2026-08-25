import { cn } from "@kpi-corp/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Sparkline } from "./sparkline";

type StatCardProps = {
	label: string;
	value: string | number;
	sub?: string;
	icon?: LucideIcon;
	trend?: number[];
	accentClassName?: string;
};

export function StatCard({
	label,
	value,
	sub,
	icon: Icon,
	trend,
	accentClassName,
}: StatCardProps) {
	return (
		<div className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4">
			<div className="flex items-start justify-between gap-2">
				<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
					{label}
				</span>
				{Icon && (
					<Icon className={cn("size-4 shrink-0 text-fg-2", accentClassName)} />
				)}
			</div>

			<span className="font-bold text-heading tabular-nums tracking-tight">
				{value}
			</span>

			<div className="flex items-end justify-between gap-2">
				{sub && <span className="text-2xs text-fg-3">{sub}</span>}
				{trend && <Sparkline data={trend} className={accentClassName} />}
			</div>
		</div>
	);
}
