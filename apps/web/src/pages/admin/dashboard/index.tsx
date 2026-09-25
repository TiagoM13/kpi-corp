import { Button } from "@kpi-corp/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { Skeleton } from "@kpi-corp/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PlayIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { useMemo } from "react";
import {
	type AdminDashboard,
	firstNameOf,
	formatToday,
	greetingFor,
} from "@/lib/dashboard";
import { orpc } from "@/utils/orpc";
import { DashboardStats } from "./components/dashboard-stats";
// Fora da tela até a API entregar a série e os top movers (DA01, DA05 em docs/pendencias-api.md).
// import { PointsChartCard } from "./components/points-chart-card";
// import { TopMoversCard } from "./components/top-movers-card";
import { RecentAssignmentsCard } from "./components/recent-assignments-card";
import { StagnantCard } from "./components/stagnant-card";
import { TopMonthCard } from "./components/top-month-card";

const SKELETON_STATS = ["a", "b", "c", "d"];

function DashboardSkeleton() {
	return (
		<div aria-busy className="flex flex-col gap-4">
			<span className="sr-only">Carregando painel…</span>
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{SKELETON_STATS.map((stat) => (
					<Skeleton key={stat} className="h-28 rounded-lg" />
				))}
			</div>
			<div className="grid gap-4 lg:grid-cols-3">
				<Skeleton className="h-72 rounded-lg lg:col-span-2" />
				<Skeleton className="h-72 rounded-lg" />
			</div>
		</div>
	);
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<TriangleAlertIcon />
				</EmptyMedia>
				<EmptyTitle>Não deu para carregar o painel</EmptyTitle>
				<EmptyDescription>Confira a conexão e tente de novo.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button type="button" variant="outline" onClick={onRetry}>
					Tentar de novo
				</Button>
			</EmptyContent>
		</Empty>
	);
}

function DashboardContent({
	dashboard,
	now,
}: {
	dashboard: AdminDashboard;
	now: Date;
}) {
	return (
		<>
			<DashboardStats dashboard={dashboard} />

			<div className="grid gap-4 lg:grid-cols-3">
				<div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
					{/* <PointsChartCard /> */}
					{/* <TopMoversCard /> */}
					<TopMonthCard entries={dashboard.ranking} />
				</div>

				<div className="flex min-w-0 flex-col gap-4">
					<StagnantCard members={dashboard.membersWithoutKpis} />
					<RecentAssignmentsCard
						assignments={dashboard.recentAssignments}
						now={now}
					/>
				</div>
			</div>
		</>
	);
}

function DashboardBody({ now }: { now: Date }) {
	const { data, isPending, isError, refetch } = useQuery(
		orpc.dashboard.getAdmin.queryOptions(),
	);

	if (isPending) {
		return <DashboardSkeleton />;
	}

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	return <DashboardContent dashboard={data} now={now} />;
}

function MeetingButton() {
	const { data } = useQuery(orpc.dashboard.getAdmin.queryOptions());
	const hasOpenMeeting = (data?.meetings.open ?? 0) > 0;

	return (
		<Button render={<Link to="/admin/meeting" />}>
			<PlayIcon data-icon="inline-start" />
			{hasOpenMeeting ? "Continuar reunião aberta" : "Iniciar modo reunião"}
		</Button>
	);
}

export function AdminDashboardPage({ name }: { name: string }) {
	const now = useMemo(() => new Date(), []);

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex flex-col gap-2">
					<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
						{formatToday(now)}
					</span>
					<h1 className="text-balance font-bold text-title tracking-tight sm:text-heading">
						{greetingFor(now)}, {firstNameOf(name)}.{" "}
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

					<MeetingButton />
				</div>
			</header>

			<DashboardBody now={now} />
		</div>
	);
}
