import type { MemberListItem } from "@/lib/members";

type Level = MemberListItem["level"];

export function LevelProgress({ level }: { level: Level }) {
	if (level.nextLevel === null || level.nextLevelPoints === null) {
		return (
			<section className="flex flex-col gap-2.5 rounded-lg border bg-card p-5">
				<h3 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
					Nível máximo
				</h3>
				<span className="text-2xs text-fg-3">
					Chegou ao topo com {level.currentPoints} pontos.
				</span>
			</section>
		);
	}

	const current = Math.max(level.currentPoints, 0) - level.levelFloor;
	const needed = level.nextLevelPoints - level.levelFloor;

	return (
		<section className="flex flex-col gap-2.5 rounded-lg border bg-card p-5">
			<div className="flex items-center justify-between gap-2">
				<h3 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
					Progresso para o nível {level.nextLevel}
				</h3>
				<span className="text-fg-2 text-xs tabular-nums">
					{current} / {needed} pts
				</span>
			</div>

			<div
				role="progressbar"
				aria-valuenow={current}
				aria-valuemin={0}
				aria-valuemax={needed}
				aria-label={`Progresso para o nível ${level.nextLevel}`}
				className="h-1.5 overflow-hidden rounded-full bg-bg-3"
			>
				<div
					className="h-full rounded-full bg-primary transition-[width] duration-500"
					style={{ width: `${level.progress}%` }}
				/>
			</div>

			<span className="text-2xs text-fg-3">
				Faltam {needed - current} pontos.
			</span>
		</section>
	);
}
