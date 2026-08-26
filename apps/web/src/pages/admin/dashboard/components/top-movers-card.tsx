import { Button } from "@kpi-corp/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { Sparkline } from "@/components/sparkline";
import { UserAvatar } from "@/components/user-avatar";
import { PERIOD_SLUGS, rankingFor } from "@/lib/ranking";

const TOP_MOVERS = 5;

export function TopMoversCard() {
	const entries = rankingFor("week").slice(0, TOP_MOVERS);

	return (
		<section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
			<div className="flex items-center justify-between gap-2">
				<h2 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
					Top movers da semana
				</h2>

				<Button
					variant="ghost"
					size="sm"
					className="text-fg-2"
					render={
						<Link to="/admin/ranking" search={{ periodo: PERIOD_SLUGS.week }} />
					}
				>
					Ver ranking
					<ArrowRightIcon data-icon="inline-end" />
				</Button>
			</div>

			<ol className="flex flex-col">
				{entries.map((entry) => (
					<li
						key={entry.member.id}
						className="flex items-center gap-3 border-b py-2.5 last:border-b-0 last:pb-0"
					>
						<span className="w-6 shrink-0 text-fg-3 text-xs tabular-nums">
							{String(entry.place).padStart(2, "0")}
						</span>

						<UserAvatar name={entry.member.name} hue={entry.member.hue} />

						<div className="flex min-w-0 flex-1 flex-col leading-tight">
							<span className="truncate font-medium text-sm">
								{entry.member.name}
							</span>
							<span className="truncate text-2xs text-fg-3">
								{entry.member.position}
							</span>
						</div>

						<Sparkline
							data={entry.member.trend}
							className="hidden sm:block"
							label={`Tendência de ${entry.member.name}`}
						/>

						<div className="flex shrink-0 flex-col items-end leading-tight">
							<span className="font-semibold text-sm tabular-nums">
								+{entry.points}
							</span>
							<span className="text-2xs text-fg-3">na semana</span>
						</div>
					</li>
				))}
			</ol>
		</section>
	);
}
