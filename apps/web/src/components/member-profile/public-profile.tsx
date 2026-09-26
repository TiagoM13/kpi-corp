import { Badge } from "@kpi-corp/ui/components/badge";
import { useQuery } from "@tanstack/react-query";
import { TargetIcon, TrophyIcon, ZapIcon } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { achievementsOfProfile, streakWeeksOf } from "@/lib/members";
import { orpc } from "@/utils/orpc";
import { LevelBadge } from "./level-badge";
import { LevelProgress } from "./level-progress";
import {
	ProfileActivity,
	ProfileActivitySkeleton,
	ProfileError,
} from "./profile-activity";
import { ProfileHeader } from "./profile-header";
import { RankingBadge } from "./ranking-badge";
import { StreakBadge } from "./streak-badge";

const pointsFormat = new Intl.NumberFormat("pt-BR");

export function PublicMemberProfile({ memberId }: { memberId: string }) {
	const { data, isPending, isError, refetch } = useQuery(
		orpc.profile.getPublicProfile.queryOptions({ input: { id: memberId } }),
	);

	if (isPending) {
		return <ProfileActivitySkeleton />;
	}

	if (isError) {
		return <ProfileError onRetry={() => void refetch()} />;
	}

	const { member, level, total } = data;
	const achievements = achievementsOfProfile(data.badges);
	const streak = streakWeeksOf(data.badges);

	return (
		<div className="flex flex-col gap-5">
			<ProfileHeader
				name={member.name}
				position={member.position}
				level={level}
				badges={
					<>
						<RankingBadge position={data.rankingPosition} />
						<LevelBadge level={level.level} />
						{streak > 0 && <StreakBadge weeks={streak} />}
						{member.role === "ADMIN" && (
							<Badge variant="outline" className="bg-bg-2 text-fg-1">
								Admin
							</Badge>
						)}
					</>
				}
			/>

			<LevelProgress level={level} />

			<div className="grid gap-3 sm:grid-cols-3">
				<StatCard
					label="Pontos totais"
					value={pointsFormat.format(total)}
					sub={`#${data.rankingPosition} de ${data.teamSize}`}
					icon={TargetIcon}
				/>
				<StatCard
					label="Próximo nível"
					value={`${level.progress}%`}
					sub={
						level.nextLevel === null
							? "nível máximo"
							: `rumo ao nível ${level.nextLevel}`
					}
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

			<ProfileActivity profile={data} />
		</div>
	);
}
