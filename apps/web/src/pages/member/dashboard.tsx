import type { AppRouterClient } from "@kpi-corp/api/routers/index";
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
import {
	SproutIcon,
	TargetIcon,
	TrendingUpIcon,
	TriangleAlertIcon,
	TrophyIcon,
	ZapIcon,
} from "lucide-react";
import { LevelBadge } from "@/components/member-profile/level-badge";
import { LevelProgress } from "@/components/member-profile/level-progress";
import { ProfileActivity } from "@/components/member-profile/profile-activity";
import { ProfileHeader } from "@/components/member-profile/profile-header";
import { RankingBadge } from "@/components/member-profile/ranking-badge";
import { StreakBadge } from "@/components/member-profile/streak-badge";
import { StatCard } from "@/components/stat-card";
import { firstNameOf } from "@/lib/dashboard";
import { achievementsOfProfile, streakWeeksOf } from "@/lib/members";
import { PERIOD_SLUGS } from "@/lib/ranking";
import { orpc } from "@/utils/orpc";

type MemberDashboard = Awaited<
	ReturnType<AppRouterClient["dashboard"]["getMember"]>
>;
type MyProfile = Awaited<
	ReturnType<AppRouterClient["profile"]["getMyProfile"]>
>;

const pointsFormat = new Intl.NumberFormat("pt-BR");

function RankingLink() {
	return (
		<Button
			variant="outline"
			render={<Link to="/ranking" search={{ periodo: PERIOD_SLUGS.all }} />}
		>
			Ver o ranking do time
		</Button>
	);
}

function NoPointsYet({ name }: { name: string }) {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<SproutIcon />
				</EmptyMedia>
				<EmptyTitle>
					{firstNameOf(name)}, você ainda não tem pontuação
				</EmptyTitle>
				<EmptyDescription>
					Seus pontos, nível e conquistas aparecem aqui assim que o primeiro KPI
					for reconhecido.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<RankingLink />
			</EmptyContent>
		</Empty>
	);
}

function DashboardSkeleton() {
	return (
		<div aria-busy className="flex flex-col gap-5">
			<span className="sr-only">Carregando seu painel…</span>
			<Skeleton className="h-32 rounded-lg" />
			<Skeleton className="h-20 rounded-lg" />
			<div className="grid gap-3 sm:grid-cols-3">
				<Skeleton className="h-28 rounded-lg" />
				<Skeleton className="h-28 rounded-lg" />
				<Skeleton className="h-28 rounded-lg" />
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
				<EmptyTitle>Não deu para carregar seu painel</EmptyTitle>
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

function MemberDashboardContent({
	dashboard,
	profile,
}: {
	dashboard: MemberDashboard;
	profile: MyProfile;
}) {
	const achievements = achievementsOfProfile(profile.badges);
	const streak = streakWeeksOf(profile.badges);

	return (
		<div className="flex flex-col gap-5">
			<ProfileHeader
				name={profile.member.name}
				position={profile.member.position}
				email={profile.member.email}
				joinedAt={profile.member.createdAt}
				level={dashboard.level}
				badges={
					<>
						<RankingBadge
							position={dashboard.rankingPosition}
							change={dashboard.rankingChange}
						/>
						<LevelBadge level={dashboard.level.level} />
						{streak > 0 && <StreakBadge weeks={streak} />}
					</>
				}
			/>

			<LevelProgress level={dashboard.level} />

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Pontos totais"
					value={pointsFormat.format(dashboard.points)}
					sub={`#${dashboard.rankingPosition} de ${dashboard.teamSize}`}
					icon={TargetIcon}
				/>
				<StatCard
					label="Pontos nesta semana"
					value={pointsFormat.format(dashboard.weekPoints)}
					trend={
						dashboard.weekSeries.length > 1 ? dashboard.weekSeries : undefined
					}
					sub="semana atual"
					icon={TrendingUpIcon}
					accentClassName="text-good"
				/>
				<StatCard
					label="KPIs recebidos"
					value={dashboard.kpiCount}
					sub="atribuições válidas"
					icon={ZapIcon}
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

			<ProfileActivity profile={profile} />

			<div className="flex justify-center">
				<RankingLink />
			</div>
		</div>
	);
}

type MemberDashboardPageProps = {
	name: string;
};

export function MemberDashboardPage({ name }: MemberDashboardPageProps) {
	const dashboard = useQuery(orpc.dashboard.getMember.queryOptions());
	const profile = useQuery(orpc.profile.getMyProfile.queryOptions());

	if (dashboard.isPending || profile.isPending) {
		return <DashboardSkeleton />;
	}

	if (dashboard.isError || profile.isError) {
		return (
			<DashboardError
				onRetry={() => {
					void dashboard.refetch();
					void profile.refetch();
				}}
			/>
		);
	}

	if (dashboard.data.kpiCount === 0) {
		return <NoPointsYet name={name} />;
	}

	return (
		<MemberDashboardContent dashboard={dashboard.data} profile={profile.data} />
	);
}
