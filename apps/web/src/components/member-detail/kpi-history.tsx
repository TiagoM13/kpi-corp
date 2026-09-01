import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { SparklesIcon, TargetIcon } from "lucide-react";
import { CategoryChip } from "@/components/category-chip";
import type { HistoryEntry } from "@/lib/member-stats";

const VISIBLE = 12;

export function KpiHistory({ entries }: { entries: HistoryEntry[] }) {
	return (
		<section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
			<div className="flex items-center justify-between gap-2">
				<h3 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
					Histórico de KPIs
				</h3>
				<span className="text-fg-3 text-xs tabular-nums">
					{entries.length} {entries.length === 1 ? "entrada" : "entradas"}
				</span>
			</div>

			{entries.length === 0 ? (
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
					{entries.slice(0, VISIBLE).map(({ activity, kpi, category }) => (
						<li
							key={activity.id}
							className="flex items-center gap-3 border-b py-3 last:border-b-0 last:pb-0"
						>
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
									{activity.when} · {activity.context} · por {activity.giver}
								</span>
							</div>

							<CategoryChip
								category={category}
								className="hidden sm:inline-flex"
							/>

							<span
								className="w-12 shrink-0 text-right font-bold text-sm tabular-nums"
								style={{ color: category.color }}
							>
								+{kpi.points}
							</span>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
