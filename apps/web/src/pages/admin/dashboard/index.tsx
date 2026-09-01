import { Badge } from "@kpi-corp/ui/components/badge";
import { Button } from "@kpi-corp/ui/components/button";
import { Link } from "@tanstack/react-router";
import { PlayIcon, PlusIcon } from "lucide-react";
import { useMemo } from "react";
import { ActivityFeed } from "@/components/activity-feed";
import { recentActivity } from "@/lib/activity-feed";
import {
	firstNameOf,
	formatToday,
	greetingFor,
	stagnantMembers,
	teamTotals,
} from "@/lib/dashboard";
import { DashboardStats } from "./components/dashboard-stats";
import { PointsChartCard } from "./components/points-chart-card";
import { StagnantCard } from "./components/stagnant-card";
import { TopMoversCard } from "./components/top-movers-card";

const FEED_SIZE = 12;

export function AdminDashboardPage({ name }: { name: string }) {
	const today = useMemo(() => new Date(), []);
	const totals = useMemo(() => teamTotals(), []);
	const stagnant = useMemo(() => stagnantMembers(), []);
	const feed = useMemo(() => recentActivity(FEED_SIZE), []);

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex flex-col gap-2">
					<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
						{formatToday(today)}
					</span>
					<h1 className="text-balance font-bold text-title tracking-tight sm:text-heading">
						{greetingFor(today)}, {firstNameOf(name)}.{" "}
						<span className="font-normal font-serif text-fg-2 italic">
							bora reconhecer.
						</span>
					</h1>
				</div>

				<div className="flex flex-col gap-2 sm:flex-row">
					<Button variant="outline" render={<Link to="/admin/kpis" />}>
						<PlusIcon data-icon="inline-start" />
						Novo KPI
					</Button>

					<Button render={<Link to="/admin/meeting" />}>
						<PlayIcon data-icon="inline-start" />
						Iniciar modo reunião
					</Button>
				</div>
			</header>

			<DashboardStats totals={totals} />

			<div className="grid gap-4 lg:grid-cols-3">
				<div className="flex flex-col gap-4 lg:col-span-2">
					<PointsChartCard />
					<TopMoversCard />
				</div>

				<div className="flex flex-col gap-4">
					<StagnantCard members={stagnant} />

					<section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
						<div className="flex items-center justify-between gap-2">
							<h2 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
								Atribuições recentes
							</h2>
							<Badge
								variant="outline"
								className="border-primary/30 bg-primary-soft text-primary"
							>
								<span
									aria-hidden
									className="size-1.5 rounded-full bg-current"
								/>
								ao vivo
							</Badge>
						</div>

						<ActivityFeed entries={feed} />
					</section>
				</div>
			</div>
		</div>
	);
}
