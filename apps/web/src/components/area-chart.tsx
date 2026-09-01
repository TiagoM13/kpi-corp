import { cn } from "@kpi-corp/ui/lib/utils";
import { type PointerEvent, useId, useMemo, useState } from "react";

const VIEW_WIDTH = 720;
const VIEW_HEIGHT = 180;
const GRID_LINES = [0, 0.5, 1];
const MAX_TICKS = 6;

const valueFormat = new Intl.NumberFormat("pt-BR");

function niceCeil(value: number) {
	if (value <= 0) return 1;
	const magnitude = 10 ** Math.floor(Math.log10(value));
	const step = magnitude / 2;
	return Math.ceil(value / step) * step;
}

type Geometry = {
	line: string;
	area: string;
	max: number;
	dots: { x: number; y: number }[];
};

function buildGeometry(points: number[]): Geometry | null {
	if (points.length === 0) return null;

	const max = niceCeil(Math.max(...points));
	const step = VIEW_WIDTH / (points.length - 1 || 1);

	let line = "";
	const dots: { x: number; y: number }[] = [];

	for (const [index, value] of points.entries()) {
		const x = index * step;
		const y = VIEW_HEIGHT - (value / max) * VIEW_HEIGHT;
		line += `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
		dots.push({ x: (x / VIEW_WIDTH) * 100, y: (y / VIEW_HEIGHT) * 100 });
	}

	return {
		line,
		area: `${line}L${VIEW_WIDTH},${VIEW_HEIGHT}L0,${VIEW_HEIGHT}Z`,
		max,
		dots,
	};
}

type AreaChartProps = {
	points: number[];
	ticks: string[];
	label: string;
	className?: string;
};

export function AreaChart({ points, ticks, label, className }: AreaChartProps) {
	const gradientId = useId();
	const [active, setActive] = useState<number | null>(null);
	const geometry = useMemo(() => buildGeometry(points), [points]);

	const tickStride = Math.max(1, Math.ceil(ticks.length / MAX_TICKS));

	if (!geometry) return null;

	const last = geometry.dots[geometry.dots.length - 1];
	const activeDot = active === null ? null : geometry.dots[active];
	const activeValue = active === null ? undefined : points[active];

	function handlePointer(event: PointerEvent<HTMLDivElement>) {
		const bounds = event.currentTarget.getBoundingClientRect();
		if (bounds.width === 0) return;

		const ratio = (event.clientX - bounds.left) / bounds.width;
		const index = Math.round(ratio * (points.length - 1));
		setActive(Math.min(points.length - 1, Math.max(0, index)));
	}

	return (
		<figure className={cn("flex flex-col gap-2", className)}>
			<div
				className="relative"
				onPointerMove={handlePointer}
				onPointerLeave={() => setActive(null)}
			>
				<svg
					viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
					preserveAspectRatio="none"
					role="img"
					aria-label={`${label}. De ${valueFormat.format(points[0] ?? 0)} a ${valueFormat.format(points[points.length - 1] ?? 0)} pontos.`}
					className="h-44 w-full"
				>
					<defs>
						<linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stopColor="var(--primary)" stopOpacity="0.12" />
							<stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
						</linearGradient>
					</defs>

					{GRID_LINES.map((ratio) => (
						<line
							key={ratio}
							x1="0"
							x2={VIEW_WIDTH}
							y1={VIEW_HEIGHT * ratio}
							y2={VIEW_HEIGHT * ratio}
							stroke="var(--border)"
							strokeWidth="1"
							vectorEffect="non-scaling-stroke"
						/>
					))}

					<path d={geometry.area} fill={`url(#${gradientId})`} />
					<path
						d={geometry.line}
						fill="none"
						stroke="var(--primary)"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</svg>

				{last ? (
					<span
						aria-hidden
						className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-card"
						style={{ left: `${last.x}%`, top: `${last.y}%` }}
					/>
				) : null}

				{activeDot && activeValue !== undefined ? (
					<>
						<span
							aria-hidden
							className="pointer-events-none absolute inset-y-0 w-px bg-line-2"
							style={{ left: `${activeDot.x}%` }}
						/>
						<span
							aria-hidden
							className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-card"
							style={{ left: `${activeDot.x}%`, top: `${activeDot.y}%` }}
						/>
						<div
							className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-sm border bg-popover px-2 py-1.5 leading-tight shadow-lg"
							style={{ left: `${activeDot.x}%`, top: `${activeDot.y}%` }}
						>
							<span className="block font-semibold text-sm">
								{valueFormat.format(activeValue)}
							</span>
							<span className="block text-2xs text-fg-3">
								{ticks[active ?? 0]}
							</span>
						</div>
					</>
				) : null}
			</div>

			<div className="flex justify-between text-2xs text-fg-3 tabular-nums">
				{ticks.map((tick, index) =>
					index % tickStride === 0 ? <span key={tick}>{tick}</span> : null,
				)}
			</div>

			<figcaption className="sr-only">
				<table>
					<caption>{label}</caption>
					<tbody>
						{ticks.map((tick, index) => (
							<tr key={tick}>
								<th scope="row">{tick}</th>
								<td>{valueFormat.format(points[index] ?? 0)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</figcaption>
		</figure>
	);
}
