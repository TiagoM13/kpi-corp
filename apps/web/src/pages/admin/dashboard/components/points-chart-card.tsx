import { Button } from "@kpi-corp/ui/components/button";
import { Skeleton } from "@kpi-corp/ui/components/skeleton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AreaChart } from "@/components/area-chart";
import {
	SegmentedControl,
	type SegmentedOption,
} from "@/components/segmented-control";
import { type SeriesPeriod, seriesTickLabel } from "@/lib/dashboard";
import { orpc } from "@/utils/orpc";

const PERIODS: { value: SeriesPeriod; label: string; title: string }[] = [
	{ value: "7d", label: "7d", title: "Últimos 7 dias" },
	{ value: "30d", label: "30d", title: "Últimos 30 dias" },
	{ value: "90d", label: "90d", title: "Últimas 12 semanas" },
	{ value: "all", label: "Tudo", title: "Desde o início" },
];

const PERIOD_OPTIONS: SegmentedOption<SeriesPeriod>[] = PERIODS.map(
	({ value, label }) => ({ value, label }),
);

export function PointsChartCard() {
	const [period, setPeriod] = useState<SeriesPeriod>("90d");
	const { data, isPending, isError, refetch } = useQuery({
		...orpc.dashboard.getPointsSeries.queryOptions({ input: { period } }),
		placeholderData: keepPreviousData,
	});
	const title = PERIODS.find((item) => item.value === period)?.title ?? "";

	return (
		<section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col gap-1">
					<h2 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
						Pontos por semana
					</h2>
					<p className="font-semibold text-base">{title}</p>
				</div>

				<SegmentedControl
					label="Período do gráfico"
					value={period}
					options={PERIOD_OPTIONS}
					onValueChange={setPeriod}
					className="self-start"
				/>
			</div>

			{isPending && <Skeleton className="h-44 rounded-md" />}

			{isError && (
				<div className="flex h-44 flex-col items-center justify-center gap-3 text-center">
					<p className="text-fg-2 text-sm">Não deu para carregar o gráfico.</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void refetch()}
					>
						Tentar de novo
					</Button>
				</div>
			)}

			{data && (
				<AreaChart
					points={data.buckets.map((bucket) => bucket.points)}
					ticks={data.buckets.map((bucket) =>
						seriesTickLabel(
							data.period,
							bucket.start,
							data.buckets[data.buckets.length - 1]?.start ?? bucket.start,
						),
					)}
					label={`Pontos do time — ${title}`}
				/>
			)}
		</section>
	);
}
