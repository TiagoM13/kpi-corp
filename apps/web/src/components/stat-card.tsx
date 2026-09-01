import { cn } from "@kpi-corp/ui/lib/utils";
import { ArrowDownIcon, ArrowUpIcon, type LucideIcon } from "lucide-react";
import { Sparkline } from "./sparkline";

function StatDelta({ delta }: { delta: number }) {
	if (delta === 0) {
		return (
			<span className="text-fg-3 text-xs tabular-nums">
				<span aria-hidden>0%</span>
				<span className="sr-only">estável em relação ao período anterior</span>
			</span>
		);
	}

	const climbed = delta > 0;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5 font-semibold text-xs tabular-nums",
				climbed ? "text-good" : "text-bad",
			)}
		>
			{climbed ? (
				<ArrowUpIcon aria-hidden className="size-3" />
			) : (
				<ArrowDownIcon aria-hidden className="size-3" />
			)}
			{Math.abs(delta)}%
			<span className="sr-only">
				{climbed ? "acima" : "abaixo"} do período anterior
			</span>
		</span>
	);
}

type StatCardProps = {
	label: string;
	value: string | number;
	sub?: string;
	icon?: LucideIcon;
	trend?: number[];
	delta?: number;
	accentClassName?: string;
};

export function StatCard({
	label,
	value,
	sub,
	icon: Icon,
	trend,
	delta,
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

			<div className="flex items-baseline gap-2">
				<span className="font-bold text-heading tracking-tight">{value}</span>
				{delta === undefined ? null : <StatDelta delta={delta} />}
			</div>

			<div className="flex items-end justify-between gap-2">
				{sub && <span className="text-2xs text-fg-3">{sub}</span>}
				{trend && <Sparkline data={trend} className={accentClassName} />}
			</div>
		</div>
	);
}
