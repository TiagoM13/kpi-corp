import {
	TargetIcon,
	TrendingUpIcon,
	TriangleAlertIcon,
	UsersIcon,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import type { TeamTotals } from "@/lib/dashboard";
import { TEAM_HISTORY, TEAM_STATS } from "@/mocks/team-history";

const pointsFormat = new Intl.NumberFormat("pt-BR");

export function DashboardStats({ totals }: { totals: TeamTotals }) {
	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<StatCard
				label="Pontos totais"
				value={pointsFormat.format(totals.points)}
				delta={TEAM_STATS.pointsDelta}
				sub="vs. mês anterior"
				icon={TargetIcon}
				trend={TEAM_HISTORY["90d"].points.slice(-8)}
			/>
			<StatCard
				label="KPIs nesta semana"
				value={totals.weekKpis}
				delta={TEAM_STATS.kpisDelta}
				sub={`${totals.weekMeetings} reuniões registradas`}
				icon={TrendingUpIcon}
				accentClassName="text-good"
				trend={TEAM_HISTORY["7d"].points}
			/>
			<StatCard
				label="Membros ativos"
				value={`${totals.activeMembers} / ${totals.totalMembers}`}
				delta={TEAM_STATS.membersDelta}
				sub="todos no time"
				icon={UsersIcon}
			/>
			<StatCard
				label="Estagnados"
				value={totals.stagnantCount}
				sub="sem KPI há 7 dias ou mais"
				icon={TriangleAlertIcon}
				accentClassName="text-warn"
			/>
		</div>
	);
}
