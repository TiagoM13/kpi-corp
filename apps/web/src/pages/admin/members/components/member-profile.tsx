import { Badge } from "@kpi-corp/ui/components/badge";
import { useQuery } from "@tanstack/react-query";
import { TargetIcon, TrophyIcon, ZapIcon } from "lucide-react";
import { LevelProgress } from "@/components/member-profile/level-progress";
import {
	InactiveNotice,
	ProfileActivity,
	ProfileActivitySkeleton,
	ProfileError,
} from "@/components/member-profile/profile-activity";
import { ProfileHeader } from "@/components/member-profile/profile-header";
import { RankingBadge } from "@/components/member-profile/ranking-badge";
import { StatCard } from "@/components/stat-card";
import { type MemberListItem, memberStatusOf } from "@/lib/members";
import { orpc } from "@/utils/orpc";
import { formatPoints, LevelBadge, StatusBadge } from "./member-cells";

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
	const { data: profile } = useQuery(
		orpc.profile.getPublicProfile.queryOptions({
			input: { id: member.id },
			enabled: member.active,
		}),
	);

	return (
		<div className="flex flex-col gap-5">
			<ProfileHeader
				name={member.name}
				position={member.position}
				email={member.email}
				joinedAt={member.createdAt}
				level={member.level}
				badges={
					<>
						{profile && <RankingBadge position={profile.rankingPosition} />}
						<LevelBadge level={member.level.level} />
						<StatusBadge status={memberStatusOf(member)} />
						{member.role === "ADMIN" && (
							<Badge variant="outline" className="bg-bg-2 text-fg-1">
								Admin
							</Badge>
						)}
					</>
				}
			/>

			<LevelProgress level={member.level} />

			<div className="grid gap-3 sm:grid-cols-3">
				<StatCard
					label="Pontos totais"
					value={formatPoints(member.points)}
					sub={
						profile
							? `#${profile.rankingPosition} de ${profile.teamSize}`
							: undefined
					}
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
