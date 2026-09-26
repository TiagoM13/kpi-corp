import { cn } from "@kpi-corp/ui/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { categoryOfApi } from "@/lib/categories";
import type { MeetingAssignment, MeetingPerson } from "@/lib/meetings";

type AttendeeCardProps = {
	member: MeetingPerson;
	given: MeetingAssignment[];
	selectedKpiName: string | null;
	busy: boolean;
	onGive: (memberId: string) => void;
};

export function AttendeeCard({
	member,
	given,
	selectedKpiName,
	busy,
	onGive,
}: AttendeeCardProps) {
	const armed = selectedKpiName !== null;

	return (
		<button
			type="button"
			disabled={!armed || busy}
			onClick={() => onGive(member.id)}
			aria-label={
				armed
					? `Dar ${selectedKpiName} para ${member.name}`
					: `${member.name}, ${given.length} ${given.length === 1 ? "reconhecimento" : "reconhecimentos"} nesta reunião`
			}
			className={cn(
				"flex w-full flex-col gap-2.5 rounded-lg border p-3.5 text-left transition-colors",
				given.length > 0
					? "border-primary/40 bg-primary-soft"
					: "border-border bg-card",
				armed && "hover:border-primary hover:bg-muted/50",
				!armed && "cursor-default",
				busy && "opacity-70",
			)}
		>
			<div className="flex items-center gap-3">
				<UserAvatar name={member.name} />

				<div className="flex min-w-0 flex-1 flex-col leading-tight">
					<span className="truncate font-semibold text-sm">{member.name}</span>
					<span className="truncate text-2xs text-fg-3">
						{member.position ?? "—"}
					</span>
				</div>

				{/* Total de pontos na reunião: a API não entrega (MT01 em docs/pendencias-api.md). */}
			</div>

			{given.length > 0 && (
				<ul className="flex flex-wrap gap-1">
					{given.map((item) => {
						const category = categoryOfApi(item.kpi.category);

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
								{item.kpi.name} · +{item.points}
							</li>
						);
					})}
				</ul>
			)}
		</button>
	);
}
