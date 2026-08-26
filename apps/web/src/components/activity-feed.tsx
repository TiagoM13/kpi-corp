import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { SparklesIcon } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import type { ActivityEntry } from "@/lib/activity-feed";
import { firstNameOf } from "@/lib/dashboard";

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
	if (entries.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<SparklesIcon />
					</EmptyMedia>
					<EmptyTitle>Nenhuma atribuição ainda</EmptyTitle>
					<EmptyDescription>
						Os reconhecimentos do time aparecem aqui.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<ul className="flex flex-col gap-1">
			{entries.map(({ activity, kpi, category, member }) => (
				<li key={activity.id} className="flex items-center gap-3 py-2">
					<UserAvatar
						name={member.name}
						hue={member.hue}
						className="size-6 text-2xs"
					/>

					<div className="flex min-w-0 flex-1 flex-col leading-tight">
						<span className="truncate text-xs">
							<span className="font-semibold">{firstNameOf(member.name)}</span>
							<span className="text-fg-2"> ganhou </span>
							<span className="font-medium" style={{ color: category.color }}>
								{kpi.name}
							</span>
						</span>
						<span className="truncate text-2xs text-fg-3">
							{activity.when} · {activity.context}
						</span>
					</div>

					<span
						className="shrink-0 font-semibold text-xs tabular-nums"
						style={{ color: category.color }}
					>
						+{kpi.points}
					</span>
				</li>
			))}
		</ul>
	);
}
