import { Button } from "@kpi-corp/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { cn } from "@kpi-corp/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from "lucide-react";
import { Sparkline } from "@/components/sparkline";
import { UserAvatar } from "@/components/user-avatar";
import type { DashboardMover } from "@/lib/dashboard";
import { PERIOD_SLUGS } from "@/lib/ranking";

const pointsFormat = new Intl.NumberFormat("pt-BR");

function plural(total: number) {
	return `${total} ${total === 1 ? "posição" : "posições"}`;
}

function MoverChange({ change }: { change: number | null }) {
	if (change === null || change === 0) {
		return null;
	}

	const climbed = change > 0;
	const Icon = climbed ? ArrowUpIcon : ArrowDownIcon;

	return (
		<span
			className={cn(
				"inline-flex items-center font-semibold text-2xs tabular-nums",
				climbed ? "text-good" : "text-bad",
			)}
		>
			<Icon aria-hidden className="size-3" />
			{Math.abs(change)}
			<span className="sr-only">
				{climbed ? "subiu" : "desceu"} {plural(Math.abs(change))}
			</span>
		</span>
	);
}

export function TopMoversCard({ movers }: { movers: DashboardMover[] }) {
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

			{movers.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>Ninguém pontuou nesta semana ainda</EmptyTitle>
						<EmptyDescription>Quem mais pontuar aparece aqui.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<ol className="flex flex-col">
					{movers.map((mover) => (
						<li
							key={mover.member.id}
							className="flex items-center gap-3 border-b py-2.5 last:border-b-0 last:pb-0"
						>
							<span className="w-6 shrink-0 text-fg-3 text-xs tabular-nums">
								{String(mover.position).padStart(2, "0")}
							</span>

							<UserAvatar name={mover.member.name} />

							<div className="flex min-w-0 flex-1 flex-col leading-tight">
								<span className="flex items-center gap-1.5">
									<span className="truncate font-medium text-sm">
										{mover.member.name}
									</span>
									<MoverChange change={mover.change} />
								</span>
								<span className="truncate text-2xs text-fg-3">
									{mover.member.position ?? "—"}
								</span>
							</div>

							{mover.series.length > 1 && (
								<Sparkline
									data={mover.series}
									className="hidden sm:block"
									label={`Tendência de ${mover.member.name}`}
								/>
							)}

							<div className="flex shrink-0 flex-col items-end leading-tight">
								<span className="font-semibold text-sm tabular-nums">
									+{pointsFormat.format(mover.points)}
								</span>
								<span className="text-2xs text-fg-3">na semana</span>
							</div>
						</li>
					))}
				</ol>
			)}
		</section>
	);
}
