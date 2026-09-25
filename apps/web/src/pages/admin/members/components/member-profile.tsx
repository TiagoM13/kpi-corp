import { Badge } from "@kpi-corp/ui/components/badge";
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
import {
	CircleSlashIcon,
	TargetIcon,
	TriangleAlertIcon,
	TrophyIcon,
	ZapIcon,
} from "lucide-react";
import { LevelRing } from "@/components/level-ring";
import { AchievementGrid } from "@/components/member-detail/achievement-grid";
import { CategoryBreakdown } from "@/components/member-detail/category-breakdown";
import { StatCard } from "@/components/stat-card";
import { UserAvatar } from "@/components/user-avatar";
import {
	achievementsOfProfile,
	categorySharesOf,
	type MemberListItem,
	type MemberProfile as MemberProfileData,
	memberStatusOf,
} from "@/lib/members";
import { orpc } from "@/utils/orpc";
import { formatPoints, LevelBadge, StatusBadge } from "./member-cells";
import { MemberKpiHistory } from "./member-kpi-history";
import { MemberLevelProgress } from "./member-level-progress";

const joinedFormat = new Intl.DateTimeFormat("pt-BR", {
	month: "long",
	year: "numeric",
});

function ProfileHeader({ member }: { member: MemberListItem }) {
	return (
		<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
			<div className="flex min-w-0 items-start gap-3 sm:contents">
				<UserAvatar
					name={member.name}
					className="size-16 text-xl sm:order-1 sm:size-24 sm:text-3xl"
				/>

				<div className="flex min-w-0 flex-1 flex-col gap-2 sm:order-2">
					<div className="flex flex-wrap items-center gap-1.5">
						<LevelBadge level={member.level.level} />
						<StatusBadge status={memberStatusOf(member)} />
						{member.role === "ADMIN" && (
							<Badge variant="outline" className="bg-bg-2 text-fg-1">
								Admin
							</Badge>
						)}
					</div>

					<h2 className="font-bold text-title tracking-tight sm:text-heading">
						{member.name}
					</h2>

					<div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-fg-2 text-sm">
						{member.position && (
							<>
								<span>{member.position}</span>
								<span aria-hidden>·</span>
							</>
						)}
						<span className="wrap-break-word min-w-0">{member.email}</span>
					</div>

					<span className="text-fg-3 text-xs">
						Entrou em {joinedFormat.format(member.createdAt)}
					</span>
				</div>
			</div>

			<LevelRing
				points={member.points}
				progress={{ level: member.level.level, percent: member.level.progress }}
				className="size-28 self-center sm:order-3 sm:size-24 sm:self-start"
			/>
		</header>
	);
}

function ProfileActivity({ profile }: { profile: MemberProfileData }) {
	const achievements = achievementsOfProfile(profile.badges);

	return (
		<>
			<div className="grid gap-3 lg:grid-cols-2">
				<div className="min-w-0">
					<CategoryBreakdown shares={categorySharesOf(profile.categories)} />
				</div>
				<div className="min-w-0">
					<AchievementGrid achievements={achievements} />
				</div>
			</div>

			<MemberKpiHistory kpis={profile.kpis} />
		</>
	);
}

function ProfileActivitySkeleton() {
	return (
		<div aria-busy className="flex flex-col gap-3">
			<span className="sr-only">Carregando perfil…</span>
			<div className="grid gap-3 lg:grid-cols-2">
				<Skeleton className="h-48 rounded-lg" />
				<Skeleton className="h-48 rounded-lg" />
			</div>
			<Skeleton className="h-64 rounded-lg" />
		</div>
	);
}

function InactiveNotice() {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<CircleSlashIcon />
				</EmptyMedia>
				<EmptyTitle>Membro inativo</EmptyTitle>
				<EmptyDescription>
					Histórico, categorias e conquistas só aparecem para membros ativos.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

function ProfileError({ onRetry }: { onRetry: () => void }) {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<TriangleAlertIcon />
				</EmptyMedia>
				<EmptyTitle>Não deu para carregar o perfil</EmptyTitle>
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

function ActiveProfileActivity({ memberId }: { memberId: string }) {
	const { data, isPending, isError, refetch } = useQuery(
		orpc.profile.getPublicProfile.queryOptions({ input: { id: memberId } }),
	);

	if (isPending) {
		return <ProfileActivitySkeleton />;
	}

	if (isError) {
		return <ProfileError onRetry={() => void refetch()} />;
	}

	return <ProfileActivity profile={data} />;
}

export function MemberProfile({ member }: { member: MemberListItem }) {
	const { nextLevel, progress } = member.level;

	return (
		<div className="flex flex-col gap-5">
			<ProfileHeader member={member} />

			<MemberLevelProgress level={member.level} />

			<div className="grid gap-3 sm:grid-cols-3">
				<StatCard
					label="Pontos totais"
					value={formatPoints(member.points)}
					sub={`nível ${member.level.level}`}
					icon={TargetIcon}
				/>
				<StatCard
					label="KPIs recebidos"
					value={member.kpiCount}
					sub="atribuições válidas"
					icon={ZapIcon}
					accentClassName="text-good"
				/>
				<StatCard
					label="Próximo nível"
					value={`${progress}%`}
					sub={
						nextLevel === null ? "nível máximo" : `rumo ao nível ${nextLevel}`
					}
					icon={TrophyIcon}
					accentClassName="text-primary"
				/>
			</div>

			{member.active ? (
				<ActiveProfileActivity memberId={member.id} />
			) : (
				<InactiveNotice />
			)}
		</div>
	);
}
