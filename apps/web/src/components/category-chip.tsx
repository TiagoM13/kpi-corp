import { Badge } from "@kpi-corp/ui/components/badge";
import { cn } from "@kpi-corp/ui/lib/utils";
import type { KpiCategory } from "@/mocks/kpis";

type CategoryChipProps = {
	category: KpiCategory;
	className?: string;
};

export function CategoryChip({ category, className }: CategoryChipProps) {
	return (
		<Badge
			variant="outline"
			className={cn("shrink-0", className)}
			style={{
				color: category.color,
				backgroundColor: `color-mix(in oklab, ${category.color} 14%, transparent)`,
				borderColor: `color-mix(in oklab, ${category.color} 30%, transparent)`,
			}}
		>
			<span aria-hidden className="size-1.5 rounded-full bg-current" />
			{category.label}
		</Badge>
	);
}
