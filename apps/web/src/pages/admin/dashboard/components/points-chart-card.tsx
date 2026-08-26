import { useState } from "react";
import { AreaChart } from "@/components/area-chart";
import {
	SegmentedControl,
	type SegmentedOption,
} from "@/components/segmented-control";
import {
	TEAM_HISTORY,
	TEAM_PERIODS,
	type TeamPeriod,
} from "@/mocks/team-history";

const PERIOD_OPTIONS: SegmentedOption<TeamPeriod>[] = TEAM_PERIODS.map(
	(period) => ({ value: period, label: TEAM_HISTORY[period].shortLabel }),
);

export function PointsChartCard() {
	const [period, setPeriod] = useState<TeamPeriod>("90d");
	const series = TEAM_HISTORY[period];

	return (
		<section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col gap-1">
					<h2 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
						Pontos por semana
					</h2>
					<p className="font-semibold text-base">{series.title}</p>
				</div>

				<SegmentedControl
					label="Período do gráfico"
					value={period}
					options={PERIOD_OPTIONS}
					onValueChange={setPeriod}
					className="self-start"
				/>
			</div>

			<AreaChart
				points={series.points}
				ticks={series.ticks}
				label={`Pontos do time — ${series.title}`}
			/>
		</section>
	);
}
