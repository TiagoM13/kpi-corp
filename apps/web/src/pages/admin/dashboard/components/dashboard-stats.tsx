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

export function DashboardStats({ dashboard }: { dashboard: AdminDashboard }) {
	const { points, kpis, meetings, members, membersWithoutKpis } = dashboard;

	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<StatCard
				label="Pontos no mês"
				value={pointsFormat.format(points.month)}
				sub={`${pointsFormat.format(points.week)} nesta semana`}
				icon={TargetIcon}
			/>
			<StatCard
				label="KPIs nesta semana"
				value={kpis.week}
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
				sub="há 30 dias ou mais"
				icon={TriangleAlertIcon}
				accentClassName="text-warn"
			/>
		</div>
	);
}
