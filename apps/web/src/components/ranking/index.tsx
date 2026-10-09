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
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { TriangleAlertIcon, UsersIcon } from "lucide-react";
import { useMemo } from "react";
import {
	SegmentedControl,
	type SegmentedOption,
} from "@/components/segmented-control";
import {
	formatPeriodWindow,
	PERIOD_LABELS,
	type RankingPeriod,
	type TeamRanking,
	type TeamRankingEntry,
} from "@/lib/ranking";
import { orpc } from "@/utils/orpc";
import { RankingPodium } from "./ranking-podium";
import { RankingTable } from "./ranking-table";

const PODIUM_SIZE = 3;
const SKELETON_ROWS = ["a", "b", "c", "d", "e"];

const pointsFormat = new Intl.NumberFormat("pt-BR");

type RankedMember = TeamRankingEntry["member"];

function RankingSkeleton() {
	return (
		<div aria-busy className="flex flex-col gap-6">
			<span className="sr-only">Carregando ranking…</span>
			<Skeleton className="h-64 rounded-lg" />
			<div className="flex flex-col gap-2 rounded-lg border p-4">
				{SKELETON_ROWS.map((row) => (
					<Skeleton key={row} className="h-10" />
				))}
			</div>
		</div>
	);
}

function RankingError({ onRetry }: { onRetry: () => void }) {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<TriangleAlertIcon />
				</EmptyMedia>
				<EmptyTitle>Não deu para carregar o ranking</EmptyTitle>
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

function RankingEmpty() {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<UsersIcon />
				</EmptyMedia>
				<EmptyTitle>Ninguém no ranking ainda</EmptyTitle>
				<EmptyDescription>
					O ranking aparece assim que houver membros ativos no time.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

function MyStanding({ me }: { me: TeamRanking["me"] }) {
	if (!me) return null;

	return (
		<p className="text-fg-2 text-sm">
			Você está em{" "}
			<span className="font-semibold text-foreground">{me.position}º</span> com{" "}
			<span className="font-semibold text-foreground tabular-nums">
				{pointsFormat.format(me.points)}
			</span>{" "}
			{me.points === 1 ? "ponto" : "pontos"}.
		</p>
	);
}

type RankingResultsProps = {
	ranking: TeamRanking;
	onOpenMember?: (member: RankedMember) => void;
};

function RankingResults({ ranking, onOpenMember }: RankingResultsProps) {
	const podium = useMemo(
		() => ranking.items.slice(0, PODIUM_SIZE),
		[ranking.items],
	);
	const rest = useMemo(() => ranking.items.slice(PODIUM_SIZE), [ranking.items]);

	if (ranking.items.length === 0) {
		return <RankingEmpty />;
	}

	const nobodyScored = ranking.items.every((entry) => entry.kpiCount === 0);

	return (
		<>
			{nobodyScored && (
				<p className="rounded-md border bg-bg-2 px-4 py-3 text-fg-2 text-sm">
					Ninguém recebeu KPI neste período ainda. A ordem por enquanto é
					alfabética.
				</p>
			)}

			<RankingPodium
				key={ranking.period}
				entries={podium}
				onOpenMember={onOpenMember}
			/>

			{rest.length > 0 && (
				<div className="rounded-lg border bg-card">
					<RankingTable entries={rest} onOpenMember={onOpenMember} />
				</div>
			)}
		</>
	);
}

type RankingBoardProps = {
	period: RankingPeriod;
	periods: RankingPeriod[];
	onPeriodChange: (period: RankingPeriod) => void;
	onOpenMember?: (member: RankedMember) => void;
};

export function RankingBoard({
	period,
	periods,
	onPeriodChange,
	onOpenMember,
}: RankingBoardProps) {
	const { data, isPending, isError, refetch } = useQuery(
		orpc.ranking.get.queryOptions({
			input: { period },
			placeholderData: keepPreviousData,
		}),
	);

	const options = useMemo<SegmentedOption<RankingPeriod>[]>(
		() => periods.map((value) => ({ value, label: PERIOD_LABELS[value] })),
		[periods],
	);

	const periodWindow = data ? formatPeriodWindow(data) : null;

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex flex-col gap-2">
					<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
						Ranking
						{periodWindow && (
							<span className="normal-case tracking-normal">
								{" "}
								· {periodWindow}
							</span>
						)}
					</span>
					<h1 className="text-balance font-bold text-title tracking-tight sm:text-heading">
						Quem tá{" "}
						<span className="font-normal font-serif text-primary italic">
							brilhando
						</span>{" "}
						agora
					</h1>
					{data && <MyStanding me={data.me} />}
				</div>

				<SegmentedControl
					label="Período do ranking"
					value={period}
					options={options}
					onValueChange={onPeriodChange}
					className="self-start lg:self-auto"
				/>
			</header>

			<RankingBody
				data={data}
				isPending={isPending}
				isError={isError}
				onRetry={() => void refetch()}
				onOpenMember={onOpenMember}
			/>
		</div>
	);
}

type RankingBodyProps = {
	data: TeamRanking | undefined;
	isPending: boolean;
	isError: boolean;
	onRetry: () => void;
	onOpenMember?: (member: RankedMember) => void;
};

function RankingBody({
	data,
	isPending,
	isError,
	onRetry,
	onOpenMember,
}: RankingBodyProps) {
	if (isPending) {
		return <RankingSkeleton />;
	}

	if (isError || !data) {
		return <RankingError onRetry={onRetry} />;
	}

	return <RankingResults ranking={data} onOpenMember={onOpenMember} />;
}
