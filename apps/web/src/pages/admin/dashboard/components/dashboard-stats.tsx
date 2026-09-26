import {
	TargetIcon,
	TrendingUpIcon,
	TriangleAlertIcon,
	UsersIcon,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import type { AdminDashboard } from "@/lib/dashboard";

const pointsFormat = new Intl.NumberFormat("pt-BR");

function plural(total: number, one: string, many: string) {
	return `${total} ${total === 1 ? one : many}`;
}

function monthSub(month: number, delta: number | null) {
	const base = `${pointsFormat.format(month)} no mês`;

	if (delta === null) {
		return base;
	}

	return `${base} · ${delta > 0 ? "+" : ""}${delta}% vs. mês anterior`;
}

export function DashboardStats({ dashboard }: { dashboard: AdminDashboard }) {
	const {
		points,
		kpis,
		meetings,
		members,
		membersWithoutKpis,
		withoutKpisDays,
	} = dashboard;

	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<StatCard
				label="Pontos totais"
				value={pointsFormat.format(points.total)}
				sub={monthSub(points.month, points.monthDelta)}
				icon={TargetIcon}
			/>
			<StatCard
				label="KPIs nesta semana"
				value={kpis.week}
				delta={kpis.weekDelta ?? undefined}
				sub={`${plural(meetings.week, "reunião", "reuniões")} nesta semana`}
				icon={TrendingUpIcon}
				accentClassName="text-good"
			/>
			<StatCard
				label="Membros ativos"
				value={`${members.active} / ${members.total}`}
				sub="ativos / cadastrados"
				icon={UsersIcon}
			/>
			<StatCard
				label="Sem KPI"
				value={membersWithoutKpis.length}
				sub={`há ${withoutKpisDays} dias ou mais`}
				icon={TriangleAlertIcon}
				accentClassName="text-warn"
			/>
		</div>
	);
}
