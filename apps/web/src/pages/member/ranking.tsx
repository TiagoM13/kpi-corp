import { RankingBoard } from "@/components/ranking";
import type { RankingPeriod } from "@/lib/ranking";

type MemberRankingPageProps = {
	memberId: string;
	period: RankingPeriod;
	onPeriodChange: (period: RankingPeriod) => void;
};

export function MemberRankingPage({
	memberId,
	period,
	onPeriodChange,
}: MemberRankingPageProps) {
	return (
		<RankingBoard
			period={period}
			onPeriodChange={onPeriodChange}
			highlightMemberId={memberId}
		/>
	);
}
