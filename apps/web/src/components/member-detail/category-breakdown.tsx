import type { CategoryShare } from "@/lib/member-stats";

export function CategoryBreakdown({ shares }: { shares: CategoryShare[] }) {
	return (
		<section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
			<h3 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
				Distribuição por categoria
			</h3>

			<ul className="flex flex-col gap-3">
				{shares.map(({ category, points, percent }) => (
					<li key={category.id} className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between gap-2 text-xs">
							<span className="flex items-center gap-2 text-fg-1">
								<span
									aria-hidden
									className="size-1.5 shrink-0 rounded-full"
									style={{ backgroundColor: category.color }}
								/>
								{category.label}
							</span>
							<span className="text-fg-2 tabular-nums">
								{points} pts · {Math.round(percent)}%
							</span>
						</div>

						<div className="h-1 overflow-hidden rounded-full bg-bg-3">
							<div
								className="h-full rounded-full"
								style={{
									width: `${percent}%`,
									backgroundColor: category.color,
								}}
							/>
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}
