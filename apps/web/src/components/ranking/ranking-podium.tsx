import { cn } from "@kpi-corp/ui/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import type { TeamRankingEntry } from "@/lib/ranking";

type RankedMember = TeamRankingEntry["member"];

const pointsFormat = new Intl.NumberFormat("pt-BR");

const PLACES = [
	{
		medal: "🥇",
		color: "var(--podium-gold)",
		bar: "sm:h-48",
		order: "sm:order-2",
		delay: "0ms",
	},
	{
		medal: "🥈",
		color: "var(--podium-silver)",
		bar: "sm:h-36",
		order: "sm:order-1",
		delay: "120ms",
	},
	{
		medal: "🥉",
		color: "var(--podium-bronze)",
		bar: "sm:h-28",
		order: "sm:order-3",
		delay: "240ms",
	},
];

const GLOW = {
	backgroundImage:
		"radial-gradient(circle at 50% 100%, color-mix(in oklab, var(--primary) 20%, transparent), transparent 60%)",
} as const;

type RankingPodiumProps = {
	entries: TeamRankingEntry[];
	onOpenMember?: (member: RankedMember) => void;
};

export function RankingPodium({ entries, onOpenMember }: RankingPodiumProps) {
	if (entries.length === 0) return null;

	return (
		<section
			aria-label="Pódio"
			className="relative overflow-hidden rounded-lg border bg-card px-4 py-8 sm:px-6"
		>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-40"
				style={GLOW}
			/>

			<ol className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-center sm:gap-6">
				{entries.map((entry, index) => {
					const place = PLACES[index];
					if (!place) return null;

					return (
						<li
							key={entry.member.id}
							style={{ animationDelay: place.delay }}
							className={cn(
								"flex items-center gap-4 rounded-md border border-border p-3 motion-safe:animate-podium-enter sm:flex-col sm:items-center sm:gap-2 sm:border-0 sm:p-0",
								place.order,
							)}
						>
							<span aria-hidden className="text-3xl sm:text-4xl">
								{place.medal}
							</span>

							<span
								className="inline-flex shrink-0 rounded-full"
								style={{ boxShadow: `0 0 0 2px ${place.color}` }}
							>
								<UserAvatar
									name={entry.member.name}
									className="size-12 text-base sm:size-20 sm:text-2xl"
								/>
							</span>

							<div className="flex min-w-0 flex-1 flex-col sm:items-center sm:text-center">
								<PodiumName entry={entry} onOpenMember={onOpenMember} />
								{entry.member.position && (
									<span className="truncate text-2xs text-fg-3">
										{entry.member.position}
									</span>
								)}
								<span
									className="font-bold text-lg tabular-nums sm:mt-1 sm:text-heading"
									style={{ color: place.color }}
								>
									{pointsFormat.format(entry.points)}
								</span>
							</div>

							<span
								aria-hidden
								style={{
									animationDelay: place.delay,
									background: `linear-gradient(180deg, ${place.color}, color-mix(in oklab, ${place.color} 30%, var(--bg-1)))`,
								}}
								className={cn(
									"hidden w-32 origin-bottom place-items-center rounded-t-md font-extrabold text-6xl text-background tracking-tighter motion-safe:animate-podium-rise sm:mt-3 sm:grid",
									place.bar,
								)}
							>
								{entry.position}
							</span>
						</li>
					);
				})}
			</ol>
		</section>
	);
}

function PodiumName({
	entry,
	onOpenMember,
}: {
	entry: TeamRankingEntry;
	onOpenMember?: (member: RankedMember) => void;
}) {
	const label = `${entry.position}º lugar: ${entry.member.name}`;

	if (!onOpenMember) {
		return (
			<span className="truncate font-semibold text-sm sm:text-base">
				<span className="sr-only">{entry.position}º lugar: </span>
				{entry.member.name}
			</span>
		);
	}

	return (
		<button
			type="button"
			onClick={() => onOpenMember(entry.member)}
			aria-label={`Ver perfil de ${entry.member.name}`}
			title={label}
			className="truncate rounded-xs text-left font-semibold text-sm hover:underline focus-visible:ring-1 focus-visible:ring-ring/50 sm:text-center sm:text-base"
		>
			<span className="sr-only">{entry.position}º lugar: </span>
			{entry.member.name}
		</button>
	);
}
