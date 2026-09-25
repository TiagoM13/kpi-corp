import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { cn } from "@kpi-corp/ui/lib/utils";
import { SparklesIcon } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { categoryOfApi } from "@/lib/categories";
import {
	type DashboardAssignment,
	firstNameOf,
	formatRelative,
} from "@/lib/dashboard";

function AssignmentItem({
	assignment,
	now,
}: {
	assignment: DashboardAssignment;
	now: Date;
}) {
	const category = categoryOfApi(assignment.kpi.category);
	const revoked = assignment.revokedAt !== null;

	return (
		<li className="flex items-center gap-3 py-2">
			<UserAvatar name={assignment.user.name} className="size-6 text-2xs" />

			<div className="flex min-w-0 flex-1 flex-col leading-tight">
				<span className={cn("truncate text-xs", revoked && "line-through")}>
					<span className="font-semibold">
						{firstNameOf(assignment.user.name)}
					</span>
					<span className="text-fg-2"> ganhou </span>
					<span className="font-medium" style={{ color: category.color }}>
						{assignment.kpi.name}
					</span>
				</span>
				<span className="truncate text-2xs text-fg-3">
					{formatRelative(assignment.assignedAt, now)}
					{assignment.meetingId ? " · em reunião" : " · avulso"}
					{revoked ? " · revogado" : ""}
				</span>
			</div>

			<span
				className={cn(
					"shrink-0 font-semibold text-xs tabular-nums",
					revoked && "text-fg-3 line-through",
				)}
				style={revoked ? undefined : { color: category.color }}
			>
				{assignment.points > 0 ? "+" : ""}
				{assignment.points}
			</span>
		</li>
	);
}

export function RecentAssignmentsCard({
	assignments,
	now,
}: {
	assignments: DashboardAssignment[];
	now: Date;
}) {
	return (
		<section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
			<h2 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
				Atribuições recentes
			</h2>

			{assignments.length === 0 ? (
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
			) : (
				<ul className="flex flex-col gap-1">
					{assignments.map((assignment) => (
						<AssignmentItem
							key={assignment.id}
							assignment={assignment}
							now={now}
						/>
					))}
				</ul>
			)}
		</section>
	);
}
