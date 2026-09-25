import { cn } from "@kpi-corp/ui/lib/utils";
import { levelProgress } from "@/lib/member-stats";

type LevelRingProps = {
	points: number;
	progress?: { level: number; percent: number };
	className?: string;
};

export function LevelRing({ points, progress, className }: LevelRingProps) {
	const { level, percent } = progress ?? levelProgress(points);

	return (
		<div
			role="img"
			aria-label={`Nível ${level}, ${Math.round(percent)}% do caminho para o próximo`}
			className={cn(
				"grid size-24 shrink-0 place-items-center rounded-full p-1.5",
				className,
			)}
			style={{
				background: `conic-gradient(var(--primary) ${percent}%, var(--bg-3) 0)`,
			}}
		>
			<div className="flex size-full flex-col items-center justify-center gap-0.5 rounded-full bg-background">
				<span className="indent-px font-medium text-2xs text-fg-3 uppercase leading-none tracking-widest">
					nível
				</span>
				<span className="font-bold text-title tabular-nums leading-none">
					{level}
				</span>
			</div>
		</div>
	);
}
