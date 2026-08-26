import { useMemo } from "react";
import {
	SegmentedControl,
	type SegmentedOption,
} from "@/components/segmented-control";
import { type RankingPeriod, rankingFor } from "@/lib/ranking";
import type { Member } from "@/mocks/members";
import { RankingPodium } from "./ranking-podium";
import { RankingTable } from "./ranking-table";

const PERIOD_OPTIONS: SegmentedOption<RankingPeriod>[] = [
	{ value: "week", label: "Semana" },
	{ value: "month", label: "Mês" },
	{ value: "all", label: "Geral" },
];

const PODIUM_SIZE = 3;

type RankingBoardProps = {
	period: RankingPeriod;
	onPeriodChange: (period: RankingPeriod) => void;
	highlightMemberId?: string;
	onOpenMember?: (member: Member) => void;
};

export function RankingBoard({
	period,
	onPeriodChange,
	highlightMemberId,
	onOpenMember,
}: RankingBoardProps) {
	const entries = rankingFor(period);
	const podium = useMemo(() => entries.slice(0, PODIUM_SIZE), [entries]);
	const rest = useMemo(() => entries.slice(PODIUM_SIZE), [entries]);

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex flex-col gap-2">
					<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
						Ranking
					</span>
					<h1 className="text-balance font-bold text-title tracking-tight sm:text-heading">
						Quem tá{" "}
						<span className="font-normal font-serif text-primary italic">
							brilhando
						</span>{" "}
						agora
					</h1>
				</div>

				<SegmentedControl
					label="Período do ranking"
					value={period}
					options={PERIOD_OPTIONS}
					onValueChange={onPeriodChange}
					className="self-start lg:self-auto"
				/>
			</header>

			<RankingPodium
				key={period}
				entries={podium}
				onOpenMember={onOpenMember}
			/>

			{rest.length > 0 && (
				<div className="rounded-lg border bg-card">
					<RankingTable
						entries={rest}
						highlightMemberId={highlightMemberId}
						onOpenMember={onOpenMember}
					/>
				</div>
			)}
		</div>
	);
}
