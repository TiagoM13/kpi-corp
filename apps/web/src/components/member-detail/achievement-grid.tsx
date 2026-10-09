import { Badge } from "@kpi-corp/ui/components/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@kpi-corp/ui/components/tooltip";
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
		<section className="flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-5">
			<div className="flex items-center justify-between gap-2">
				<h3 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
					Conquistas
				</h3>
				<Badge variant="outline" className="bg-bg-2 text-fg-1 tabular-nums">
					{earned.length}/{total}
				</Badge>
			</div>

			<TooltipProvider delay={150}>
				<ul className="grid min-h-28 flex-1 grid-cols-5 grid-rows-2 gap-2">
					{shown.map((achievement) => {
						const unlocked = earnedIds.has(achievement.id);
						const label = unlocked
							? achievement.name
							: `${achievement.name} (bloqueada)`;

						return (
							<Tooltip key={achievement.id}>
								<TooltipTrigger
									render={
										<li
											className={cn(
												"grid min-w-0 cursor-default place-items-center rounded-md text-2xl sm:text-3xl",
												unlocked
													? "border border-primary/30 bg-bg-2"
													: "border border-border border-dashed opacity-30 grayscale",
											)}
										/>
									}
								>
									<span aria-hidden>{achievement.icon}</span>
									<span className="sr-only">{label}</span>
								</TooltipTrigger>
								<TooltipContent>
									<span className="flex flex-col gap-0.5 text-left">
										<span className="font-semibold">{label}</span>
										<span className="text-background/70">
											{achievement.description}
										</span>
									</span>
								</TooltipContent>
							</Tooltip>
						);
					})}
				</ul>
			</TooltipProvider>
		</section>
	);
}
