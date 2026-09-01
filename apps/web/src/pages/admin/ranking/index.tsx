import { lazy, Suspense, useCallback, useState } from "react";
import { RankingBoard } from "@/components/ranking";
import type { RankingPeriod } from "@/lib/ranking";
import type { Member } from "@/mocks/members";

const MemberDetailDrawer = lazy(() =>
	import("@/components/member-detail").then((module) => ({
		default: module.MemberDetailDrawer,
	})),
);

type AdminRankingPageProps = {
	memberId: string;
	period: RankingPeriod;
	onPeriodChange: (period: RankingPeriod) => void;
};

export function AdminRankingPage({
	memberId,
	period,
	onPeriodChange,
}: AdminRankingPageProps) {
	const [selected, setSelected] = useState<Member | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);

	const openMember = useCallback((member: Member) => {
		setSelected(member);
		setDetailOpen(true);
	}, []);

	return (
		<>
			<RankingBoard
				period={period}
				onPeriodChange={onPeriodChange}
				highlightMemberId={memberId}
				onOpenMember={openMember}
			/>

			{selected && (
				<Suspense fallback={null}>
					<MemberDetailDrawer
						member={selected}
						open={detailOpen}
						onOpenChange={setDetailOpen}
					/>
				</Suspense>
			)}
		</>
	);
}
