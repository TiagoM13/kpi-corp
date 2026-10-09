import { Button } from "@kpi-corp/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import type { DashboardRankingEntry } from "@/lib/dashboard";
import { PERIOD_SLUGS } from "@/lib/ranking";

const pointsFormat = new Intl.NumberFormat("pt-BR");

export function TopMonthCard({
	entries,
}: {
	entries: DashboardRankingEntry[];
}) {
	return (
		<section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
			<div className="flex items-center justify-between gap-2">
				<h2 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
					Top 5 do mês
				</h2>

				<Button
					variant="ghost"
					size="sm"
					className="text-fg-2"
					render={
						<Link
							to="/admin/ranking"
							search={{ periodo: PERIOD_SLUGS.month }}
						/>
					}
				>
					Ver ranking
					<ArrowRightIcon data-icon="inline-end" />
				</Button>
			</div>

			{entries.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>Ninguém no ranking ainda</EmptyTitle>
						<EmptyDescription>
							O top 5 aparece quando houver membros ativos.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<ol className="flex flex-col">
					{entries.map((entry) => (
						<li
							key={entry.member.id}
							className="flex items-center gap-3 border-b py-2.5 last:border-b-0 last:pb-0"
						>
							<span className="w-6 shrink-0 text-fg-3 text-xs tabular-nums">
								{String(entry.position).padStart(2, "0")}
							</span>

							<UserAvatar name={entry.member.name} />

							<div className="flex min-w-0 flex-1 flex-col leading-tight">
								<span className="truncate font-medium text-sm">
									{entry.member.name}
								</span>
								<span className="truncate text-2xs text-fg-3">
									{entry.member.position ?? "—"}
								</span>
							</div>

							<div className="flex shrink-0 flex-col items-end leading-tight">
								<span className="font-semibold text-sm tabular-nums">
									{pointsFormat.format(entry.points)}
								</span>
								<span className="text-2xs text-fg-3 tabular-nums">
									{entry.kpiCount} {entry.kpiCount === 1 ? "KPI" : "KPIs"}
								</span>
							</div>
						</li>
					))}
				</ol>
			)}
		</section>
	);
}
