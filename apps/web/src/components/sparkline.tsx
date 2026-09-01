import { cn } from "@kpi-corp/ui/lib/utils";
import { useMemo } from "react";

const WIDTH = 80;
const HEIGHT = 22;
const INSET = 2;

type SparklinePath = {
	line: string;
	area: string;
	lastX: number;
	lastY: number;
};

function buildPath(data: number[]): SparklinePath | null {
	if (data.length === 0) return null;

	const max = Math.max(...data, 1);
	const min = Math.min(...data, 0);
	const range = max - min || 1;
	const step = WIDTH / (data.length - 1 || 1);
	const usable = HEIGHT - INSET * 2;

	let line = "";
	let lastX = 0;
	let lastY = 0;

	for (const [i, value] of data.entries()) {
		const x = i * step;
		const y = HEIGHT - INSET - ((value - min) / range) * usable;
		line += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
		lastX = x;
		lastY = y;
	}

	return {
		line,
		area: `${line}L${WIDTH},${HEIGHT}L0,${HEIGHT}Z`,
		lastX,
		lastY,
	};
}

type SparklineProps = {
	data: number[];
	label?: string;
	className?: string;
};

export function Sparkline({ data, label, className }: SparklineProps) {
	const path = useMemo(() => buildPath(data), [data]);

	if (!path) return null;

	return (
		<svg
			viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			className={cn("h-5.5 w-20 overflow-visible text-primary", className)}
			role={label ? "img" : "presentation"}
			aria-label={label}
			aria-hidden={label ? undefined : true}
		>
			<path d={path.area} fill="currentColor" opacity="0.12" />
			<path
				d={path.line}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<circle cx={path.lastX} cy={path.lastY} r="2" fill="currentColor" />
		</svg>
	);
}
