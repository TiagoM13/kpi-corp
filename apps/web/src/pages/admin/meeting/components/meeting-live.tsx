import { Badge } from "@kpi-corp/ui/components/badge";
import { Button } from "@kpi-corp/ui/components/button";
import { TargetIcon, UserPlusIcon } from "lucide-react";
import { useMemo } from "react";
import type { MeetingAssignment, PresentAttendee } from "@/lib/meetings";
import type { Kpi } from "@/mocks/kpis";
import { AttendeeCard } from "./attendee-card";
import { KpiPicker } from "./kpi-picker";

type MeetingLiveProps = {
	attendees: PresentAttendee[];
	kpis: Kpi[];
	given: MeetingAssignment[];
	selectedKpi: Kpi | null;
	givingTo: string | null;
	onSelectKpi: (kpiId: string | null) => void;
	onGive: (memberId: string) => void;
	onAddAttendees: () => void;
};

export function MeetingLive({
	attendees,
	kpis,
	given,
	selectedKpi,
	givingTo,
	onSelectKpi,
	onGive,
	onAddAttendees,
}: MeetingLiveProps) {
	const givenByMember = useMemo(() => {
		const map = new Map<string, MeetingAssignment[]>();
		for (const assignment of given) {
			const owned = map.get(assignment.userId);
			if (owned) {
				owned.push(assignment);
			} else {
				map.set(assignment.userId, [assignment]);
			}
		}
		return map;
	}, [given]);

	return (
		<div className="grid gap-4 lg:grid-cols-4">
			<div className="flex min-w-0 flex-col gap-3 lg:col-span-3">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2">
						<h2 className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
							Presentes
						</h2>
						<Badge variant="outline" className="bg-bg-2 text-fg-1 tabular-nums">
							{attendees.length}
						</Badge>
						<Button
							type="button"
							variant="outline"
							size="xs"
							onClick={onAddAttendees}
						>
							<UserPlusIcon data-icon="inline-start" />
							Adicionar participantes
						</Button>
					</div>

					{selectedKpi ? (
						<div className="flex items-center gap-2 text-fg-2 text-xs">
							<TargetIcon aria-hidden className="size-3.5 text-primary" />
							<span>
								Toque numa pessoa pra dar{" "}
								<b className="text-primary">{selectedKpi.name}</b>
							</span>
							<Button
								type="button"
								variant="ghost"
								size="xs"
								onClick={() => onSelectKpi(null)}
							>
								Cancelar
							</Button>
						</div>
					) : (
						<span className="text-fg-3 text-xs">
							Escolha um KPI para começar
						</span>
					)}
				</div>

				<ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{attendees.map((member) => (
						<li key={member.id}>
							<AttendeeCard
								member={member}
								given={givenByMember.get(member.id) ?? []}
								selectedKpiName={selectedKpi?.name ?? null}
								busy={givingTo === member.id}
								onGive={onGive}
							/>
						</li>
					))}
				</ul>
			</div>

			<KpiPicker
				kpis={kpis}
				selectedKpiId={selectedKpi?.id ?? null}
				onSelect={onSelectKpi}
			/>
		</div>
	);
}
