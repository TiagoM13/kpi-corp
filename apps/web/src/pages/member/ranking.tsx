import { RankingBoard } from "@/components/ranking";
import { MEMBER_RANKING_PERIODS, type RankingPeriod } from "@/lib/ranking";

type MemberRankingPageProps = {
	period: RankingPeriod;
	onPeriodChange: (period: RankingPeriod) => void;
};

export function MemberRankingPage({
	period,
	onPeriodChange,
}: MemberRankingPageProps) {
	return (
		<RankingBoard
			period={period}
			periods={MEMBER_RANKING_PERIODS}
			onPeriodChange={onPeriodChange}
		/>
	);
}
