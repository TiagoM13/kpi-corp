import { Badge } from "@kpi-corp/ui/components/badge";
import { cn } from "@kpi-corp/ui/lib/utils";
import type { MemberAchievements } from "@/lib/member-stats";

const VISIBLE = 10;

export function AchievementGrid({
	achievements,
}: {
	achievements: MemberAchievements;
}) {
	const { earned, locked, total } = achievements;
	const earnedIds = new Set(earned.map((achievement) => achievement.id));
	const shown = [...earned, ...locked].slice(0, VISIBLE);

	return (
		<section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
			<div className="flex items-center justify-between gap-2">
				<h3 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
					Conquistas
				</h3>
				<Badge variant="outline" className="bg-bg-2 text-fg-1 tabular-nums">
					{earned.length}/{total}
				</Badge>
			</div>

			<ul className="grid grid-cols-5 gap-2">
				{shown.map((achievement) => {
					const unlocked = earnedIds.has(achievement.id);

					return (
						<li
							key={achievement.id}
							title={`${achievement.name} — ${achievement.description}`}
							className={cn(
								"grid aspect-square place-items-center rounded-md text-lg",
								unlocked
									? "border border-primary/30 bg-bg-2"
									: "border border-border border-dashed opacity-30 grayscale",
							)}
						>
							<span aria-hidden>{achievement.icon}</span>
							<span className="sr-only">
								{achievement.name}
								{unlocked ? "" : " (bloqueada)"}
							</span>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
