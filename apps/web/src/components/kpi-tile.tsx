import { Badge } from "@kpi-corp/ui/components/badge";
import { cn } from "@kpi-corp/ui/lib/utils";
import { CategoryChip } from "@/components/category-chip";
import { CATEGORY_BY_ID, type Kpi } from "@/mocks/kpis";

type KpiTileProps = {
	kpi: Kpi;
	compact?: boolean;
	className?: string;
};

export function KpiTile({ kpi, compact, className }: KpiTileProps) {
	const category = CATEGORY_BY_ID.get(kpi.category);
	if (!category) return null;

	return (
		<article
			className={cn(
				"flex h-full flex-col gap-3 rounded-lg border bg-card p-4",
				!kpi.active && "opacity-60",
				className,
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<CategoryChip category={category} />

				<div className="flex shrink-0 flex-col items-end gap-0.5 leading-none">
					<span
						className="font-bold text-lg tabular-nums"
						style={{ color: category.color }}
					>
						+{kpi.points}
					</span>
					<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
						pts
					</span>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<h3 className="font-medium text-sm">{kpi.name}</h3>
				{compact ? null : (
					<p className="text-fg-2 text-xs leading-relaxed">{kpi.description}</p>
				)}
			</div>

			<div className="mt-auto flex items-center justify-between gap-2 pt-1">
				<span className="text-2xs text-fg-3 tabular-nums">
					{kpi.uses} {kpi.uses === 1 ? "uso" : "usos"}
				</span>

				{kpi.active ? null : (
					<Badge variant="outline" className="bg-bg-2 text-fg-2">
						Inativo
					</Badge>
				)}
			</div>
		</article>
	);
}
