import type { MemberListItem } from "@/lib/members";

type Level = MemberListItem["level"];

function MaxLevelBand() {
	return (
		<section className="relative flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-primary/40 px-5 py-4 text-primary-foreground">
			<div
				aria-hidden
				className="absolute inset-y-0 left-0 w-[200%] animate-flame-flow bg-flame will-change-transform motion-reduce:animate-none"
			/>
			<div
				aria-hidden
				className="absolute inset-0 bg-linear-to-t from-black/25 to-transparent"
			/>
			<span aria-hidden className="relative">
				🔥
			</span>
			<h3 className="relative font-semibold text-sm uppercase tracking-widest">
				Nível máximo atingido
			</h3>
		</section>
	);
}

export function LevelProgress({ level }: { level: Level }) {
	if (level.nextLevel === null || level.nextLevelPoints === null) {
		return <MaxLevelBand />;
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
