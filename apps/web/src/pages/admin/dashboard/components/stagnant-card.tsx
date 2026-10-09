import { Badge } from "@kpi-corp/ui/components/badge";
import { Button } from "@kpi-corp/ui/components/button";
import { Link } from "@tanstack/react-router";
import { TriangleAlertIcon } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import type { MemberWithoutKpis } from "@/lib/dashboard";

function daysLabel(member: MemberWithoutKpis) {
	const days = `${member.daysWithout} ${member.daysWithout === 1 ? "dia" : "dias"}`;

	if (member.lastAssignmentAt === null) {
		return `nunca recebeu KPI · ${days} no time`;
	}

	return `sem KPI há ${days}`;
}

export function StagnantCard({ members }: { members: MemberWithoutKpis[] }) {
	if (members.length === 0) return null;

	return (
		<section className="flex flex-col gap-4 rounded-lg border border-warn/40 bg-card p-5">
			<div className="flex items-center justify-between gap-2">
				<h2 className="flex items-center gap-2 font-semibold text-sm text-warn">
					<TriangleAlertIcon aria-hidden className="size-4" />
					Atenção — esquecidos
				</h2>

				<Badge
					variant="outline"
					className="border-warn/25 bg-warn/10 text-warn tabular-nums"
				>
					{members.length}
				</Badge>
			</div>

			<ul className="flex flex-col gap-1">
				{members.map((member) => (
					<li key={member.id} className="flex items-center gap-3 py-1.5">
						<UserAvatar name={member.name} />

						<div className="flex min-w-0 flex-1 flex-col leading-tight">
							<span className="truncate text-sm">{member.name}</span>
							<span className="truncate text-2xs text-fg-3">
								{daysLabel(member)}
							</span>
						</div>

						<Button
							variant="outline"
							size="sm"
							render={<Link to="/admin/members" />}
						>
							Reconhecer
						</Button>
					</li>
				))}
			</ul>
		</section>
	);
}
