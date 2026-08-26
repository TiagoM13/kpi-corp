import { Badge } from "@kpi-corp/ui/components/badge";
import { cn } from "@kpi-corp/ui/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import type { Attribution } from "@/lib/meeting";
import { CATEGORY_BY_ID, KPI_BY_ID } from "@/mocks/kpis";
import type { Member } from "@/mocks/members";

type AttendeeCardProps = {
	member: Member;
	given: Attribution[];
	selectedKpiName: string | null;
	onGive: (memberId: string) => void;
};

export function AttendeeCard({
	member,
	given,
	selectedKpiName,
	onGive,
}: AttendeeCardProps) {
	const total = given.reduce((sum, item) => sum + item.points, 0);
	const armed = selectedKpiName !== null;

	return (
		<button
			type="button"
			disabled={!armed}
			onClick={() => onGive(member.id)}
			aria-label={
				armed
					? `Dar ${selectedKpiName} para ${member.name}`
					: `${member.name}, ${total} pontos nesta reunião`
			}
			className={cn(
				"flex w-full flex-col gap-2.5 rounded-lg border p-3.5 text-left transition-colors",
				given.length > 0
					? "border-primary/40 bg-primary-soft"
					: "border-border bg-card",
				armed && "hover:border-primary hover:bg-muted/50",
				!armed && "cursor-default",
			)}
		>
			<div className="flex items-center gap-3">
				<UserAvatar name={member.name} hue={member.hue} />

				<div className="flex min-w-0 flex-1 flex-col leading-tight">
					<span className="truncate font-semibold text-sm">{member.name}</span>
					<span className="truncate text-2xs text-fg-3">{member.position}</span>
				</div>

				{total > 0 && (
					<Badge
						variant="outline"
						className="border-primary/30 bg-primary-soft text-primary tabular-nums"
					>
						+{total}
					</Badge>
				)}
			</div>

			{given.length > 0 && (
				<ul className="flex flex-wrap gap-1">
					{given.map((item) => {
						const kpi = KPI_BY_ID.get(item.kpiId);
						const category = kpi && CATEGORY_BY_ID.get(kpi.category);
						if (!kpi || !category) return null;

						return (
							<li
								key={item.id}
								className="rounded-full border px-2 py-0.5 text-2xs"
								style={{
									color: category.color,
									borderColor: `color-mix(in oklab, ${category.color} 30%, transparent)`,
									backgroundColor: `color-mix(in oklab, ${category.color} 14%, transparent)`,
								}}
							>
								{kpi.name}
							</li>
						);
					})}
				</ul>
			)}
		</button>
	);
}
