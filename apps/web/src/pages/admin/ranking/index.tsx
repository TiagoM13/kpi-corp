import { lazy, Suspense, useCallback, useState } from "react";
import { RankingBoard } from "@/components/ranking";
import {
	RANKING_PERIODS,
	type RankingPeriod,
	type TeamRankingEntry,
} from "@/lib/ranking";

const ProfileSheet = lazy(() =>
	import("@/components/member-profile/profile-sheet").then((module) => ({
		default: module.ProfileSheet,
	})),
);

const PublicMemberProfile = lazy(() =>
	import("@/components/member-profile/public-profile").then((module) => ({
		default: module.PublicMemberProfile,
	})),
);

type AdminRankingPageProps = {
	period: RankingPeriod;
	onPeriodChange: (period: RankingPeriod) => void;
};

export function AdminRankingPage({
	period,
	onPeriodChange,
}: AdminRankingPageProps) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);

	const openMember = useCallback((member: TeamRankingEntry["member"]) => {
		setSelectedId(member.id);
		setDetailOpen(true);
	}, []);

	return (
		<>
			<RankingBoard
				period={period}
				periods={RANKING_PERIODS}
				onPeriodChange={onPeriodChange}
				onOpenMember={openMember}
			/>

			{selectedId && (
				<Suspense fallback={null}>
					<ProfileSheet open={detailOpen} onOpenChange={setDetailOpen}>
						<PublicMemberProfile memberId={selectedId} />
					</ProfileSheet>
				</Suspense>
			)}
		</>
	);
}
