import { Badge } from "@kpi-corp/ui/components/badge";
import { TargetIcon, TrendingUpIcon, TrophyIcon } from "lucide-react";
import { memo, useMemo } from "react";
import { LevelRing } from "@/components/level-ring";
import { StatCard } from "@/components/stat-card";
import { UserAvatar } from "@/components/user-avatar";
import {
	achievementsOf,
	historyOf,
	levelProgress,
	pointsByCategory,
	rankOf,
} from "@/lib/member-stats";
import { TEAM_SIZE } from "@/lib/ranking";
import type { Member } from "@/mocks/members";
import { AchievementGrid } from "./achievement-grid";
import { CategoryBreakdown } from "./category-breakdown";
import { KpiHistory } from "./kpi-history";

const pointsFormat = new Intl.NumberFormat("pt-BR");
const joinedFormat = new Intl.DateTimeFormat("pt-BR", {
	month: "long",
	year: "numeric",
});

function formatJoinedAt(joinedAt: string) {
	return joinedFormat.format(new Date(`${joinedAt}T12:00:00`));
}

export const MemberDetail = memo(function MemberDetail({
	member,
}: {
	member: Member;
}) {
	const stats = useMemo(
		() => ({
			progress: levelProgress(member.points),
			rank: rankOf(member.id),
			history: historyOf(member.id),
			categories: pointsByCategory(member.id),
			achievements: achievementsOf(member.id),
			weekPoints: member.trend.reduce((sum, value) => sum + value, 0),
		}),
		[member],
	);

	const { progress, rank, history, categories, achievements, weekPoints } =
		stats;

	return (
		<div className="flex flex-col gap-5">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
				<div className="flex items-start gap-3 sm:contents">
					<UserAvatar
						name={member.name}
						hue={member.hue}
						className="size-16 text-xl sm:order-1 sm:size-24 sm:text-3xl"
					/>

					<div className="flex min-w-0 flex-1 flex-col gap-2 sm:order-2">
						<div className="flex flex-wrap items-center gap-1.5">
							<Badge variant="outline" className="bg-bg-2 text-fg-1">
								<span
									aria-hidden
									className="size-1.5 rounded-full bg-primary"
								/>
								#{rank} no ranking
							</Badge>
							<Badge variant="outline" className="bg-bg-2 text-fg-1">
								nv {progress.level}
							</Badge>
							{member.streak > 0 ? (
								<Badge
									variant="outline"
									className="border-warn/25 bg-warn/10 text-warn"
									aria-label={`Sequência de ${member.streak} dias`}
								>
									<span aria-hidden>🔥</span>
									{member.streak} dias
								</Badge>
							) : null}
						</div>

						<h2 className="font-bold text-title tracking-tight sm:text-heading">
							{member.name}
						</h2>

						<div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-fg-2 text-sm">
							<span>{member.position}</span>
							<span aria-hidden>·</span>
							<span className="wrap-break-word min-w-0">{member.email}</span>
						</div>

						<span className="text-fg-3 text-xs">
							Entrou em {formatJoinedAt(member.joinedAt)}
						</span>
					</div>
				</div>

				<LevelRing
					points={member.points}
					className="size-28 self-center sm:order-3 sm:size-24 sm:self-start"
				/>
			</header>

			<section className="flex flex-col gap-2.5 rounded-lg border bg-card p-5">
				<div className="flex items-center justify-between gap-2">
					<h3 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
						Progresso para o nível {progress.level + 1}
					</h3>
					<span className="text-fg-2 text-xs tabular-nums">
						{progress.current} / {progress.needed} pts
					</span>
				</div>

				<div
					role="progressbar"
					aria-valuenow={progress.current}
					aria-valuemin={0}
					aria-valuemax={progress.needed}
					aria-label={`Progresso para o nível ${progress.level + 1}`}
					className="h-1.5 overflow-hidden rounded-full bg-bg-3"
				>
					<div
						className="h-full rounded-full bg-primary transition-[width] duration-500"
						style={{ width: `${progress.percent}%` }}
					/>
				</div>

				<span className="text-2xs text-fg-3">
					Faltam {progress.remaining} pontos.
				</span>
			</section>

			<div className="grid gap-3 sm:grid-cols-3">
				<StatCard
					label="Pontos totais"
					value={pointsFormat.format(member.points)}
					sub={`#${rank} de ${TEAM_SIZE}`}
					icon={TargetIcon}
					trend={member.trend}
				/>
				<StatCard
					label="Pontos nesta semana"
					value={weekPoints}
					sub="últimos 7 dias"
					icon={TrendingUpIcon}
					accentClassName="text-good"
				/>
				<StatCard
					label="Conquistas"
					value={`${achievements.earned.length} / ${achievements.total}`}
					sub={`${achievements.total - achievements.earned.length} restantes`}
					icon={TrophyIcon}
					accentClassName="text-primary"
				/>
			</div>

			<div className="grid gap-3 lg:grid-cols-2">
				<CategoryBreakdown shares={categories} />
				<AchievementGrid achievements={achievements} />
			</div>

			<KpiHistory entries={history} />
		</div>
	);
});
