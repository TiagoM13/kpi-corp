import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { SparklesIcon, TargetIcon } from "lucide-react";
import { CategoryChip } from "@/components/category-chip";
import { categoryOfApi } from "@/lib/categories";
import type { ProfileKpi } from "@/lib/members";

const VISIBLE = 12;

const assignedFormat = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "short",
	year: "numeric",
});

function KpiHistoryItem({ kpi }: { kpi: ProfileKpi }) {
	const category = categoryOfApi(kpi.category);

	return (
		<li className="flex items-center gap-3 border-b py-3 last:border-b-0 last:pb-0">
			<div
				aria-hidden
				className="grid size-9 shrink-0 place-items-center rounded-md"
				style={{
					color: category.color,
					backgroundColor: `color-mix(in oklab, ${category.color} 14%, transparent)`,
				}}
			>
				<TargetIcon className="size-4" />
			</div>

			<div className="flex min-w-0 flex-1 flex-col leading-tight">
				<span className="truncate font-medium text-sm">{kpi.name}</span>
				<span className="truncate text-2xs text-fg-3">
					{assignedFormat.format(kpi.assignedAt)}
					{kpi.note ? ` · ${kpi.note}` : ""}
				</span>
			</div>

			<CategoryChip category={category} className="hidden sm:inline-flex" />

			<span
				className="w-12 shrink-0 text-right font-bold text-sm tabular-nums"
				style={{ color: category.color }}
			>
				+{kpi.points}
			</span>
		</li>
	);
}

export function KpiHistory({ kpis }: { kpis: ProfileKpi[] }) {
	return (
		<section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
			<div className="flex items-center justify-between gap-2">
				<h3 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
					Histórico de KPIs
				</h3>
				<span className="text-fg-3 text-xs tabular-nums">
					{kpis.length} {kpis.length === 1 ? "entrada" : "entradas"}
				</span>
			</div>

			{kpis.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<SparklesIcon />
						</EmptyMedia>
						<EmptyTitle>Nenhuma atribuição ainda</EmptyTitle>
						<EmptyDescription>
							Os reconhecimentos aparecem aqui assim que acontecem.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<ul className="flex flex-col">
					{kpis.slice(0, VISIBLE).map((kpi) => (
						<KpiHistoryItem key={kpi.id} kpi={kpi} />
					))}
				</ul>
			)}
		</section>
	);
}
