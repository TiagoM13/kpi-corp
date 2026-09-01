import { Button } from "@kpi-corp/ui/components/button";
import { Undo2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { selectKpis, useKpiStore } from "@/lib/kpi-store";
import { INITIAL_MEETING, meetingReducer, meetingSummary } from "@/lib/meeting";
import { MEMBER_BY_ID, MOCK_MEMBERS } from "@/mocks/members";
import { MeetingLive } from "./components/meeting-live";
import { MeetingSetup } from "./components/meeting-setup";
import { MeetingShell } from "./components/meeting-shell";
import { MeetingSummaryView } from "./components/meeting-summary";
import { MeetingTimer } from "./components/meeting-timer";

const PRESENCE_KPI_NAME = "Presença na reunião";

export function AdminMeetingPage({ onExit }: { onExit: () => void }) {
	const kpis = useKpiStore(selectKpis);
	const [state, dispatch] = useReducer(meetingReducer, INITIAL_MEETING);
	const [startedAt] = useState(() => new Date());
	const [announcement, setAnnouncement] = useState("");

	const activeKpis = useMemo(() => kpis.filter((kpi) => kpi.active), [kpis]);
	const presenceKpi = useMemo(
		() => activeKpis.find((kpi) => kpi.name === PRESENCE_KPI_NAME),
		[activeKpis],
	);
	const selectedKpi = useMemo(
		() => activeKpis.find((kpi) => kpi.id === state.selectedKpiId) ?? null,
		[activeKpis, state.selectedKpiId],
	);
	const attendees = useMemo(
		() => MOCK_MEMBERS.filter((member) => state.present.includes(member.id)),
		[state.present],
	);
	const summary = useMemo(
		() => meetingSummary(state.given, MEMBER_BY_ID),
		[state.given],
	);

	useEffect(() => {
		if (state.phase !== "live") return;

		const timer = setInterval(() => dispatch({ type: "tick" }), 1000);
		return () => clearInterval(timer);
	}, [state.phase]);

	const handleGive = useCallback(
		(memberId: string) => {
			if (!selectedKpi) return;

			dispatch({ type: "give", memberId, kpi: selectedKpi });
			setAnnouncement(
				`${MEMBER_BY_ID.get(memberId)?.name ?? "Membro"} ganhou ${selectedKpi.name}, mais ${selectedKpi.points} pontos.`,
			);
		},
		[selectedKpi],
	);

	const handleExit = useCallback(() => {
		if (state.phase === "live") {
			const leave = window.confirm(
				"A reunião está em andamento. Sair agora descarta o que foi atribuído.",
			);
			if (!leave) return;
		}

		onExit();
	}, [onExit, state.phase]);

	if (state.phase === "setup") {
		return (
			<MeetingShell title={state.title} onExit={handleExit}>
				<MeetingSetup
					title={state.title}
					members={MOCK_MEMBERS}
					present={state.present}
					presenceKpi={presenceKpi}
					startedAt={startedAt}
					onTitleChange={(title) => dispatch({ type: "setTitle", title })}
					onToggle={(memberId) => dispatch({ type: "togglePresent", memberId })}
					onMarkAll={() =>
						dispatch({
							type: "markAll",
							memberIds: MOCK_MEMBERS.map((member) => member.id),
						})
					}
					onClear={() => dispatch({ type: "clearPresent" })}
					onStart={() => dispatch({ type: "start", presenceKpi })}
				/>
			</MeetingShell>
		);
	}

	if (state.phase === "done") {
		return (
			<MeetingShell title={state.title} onExit={onExit}>
				<MeetingSummaryView
					title={state.title}
					elapsed={state.elapsed}
					summary={summary}
					onExit={onExit}
					onRestart={() => dispatch({ type: "restart" })}
				/>
			</MeetingShell>
		);
	}

	return (
		<MeetingShell
			title={state.title}
			onExit={handleExit}
			live={
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
					<div className="flex flex-wrap items-center gap-6 sm:gap-4">
						<MeetingStat label="Tempo">
							<MeetingTimer elapsed={state.elapsed} />
						</MeetingStat>
						<MeetingStat label="Presentes">
							<span className="font-bold text-lg tabular-nums">
								{attendees.length}
							</span>
						</MeetingStat>
						<MeetingStat label="Reconhecimentos">
							<span className="font-bold text-lg text-primary tabular-nums">
								{state.given.length}
							</span>
						</MeetingStat>
					</div>

					<div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4">
						<Button
							type="button"
							variant="outline"
							disabled={state.given.length === 0}
							onClick={() => dispatch({ type: "undo" })}
							className="w-full sm:w-auto"
						>
							<Undo2Icon data-icon="inline-start" />
							Desfazer
						</Button>

						<Button
							type="button"
							onClick={() => dispatch({ type: "end" })}
							className="w-full sm:w-auto"
						>
							Encerrar reunião
						</Button>
					</div>
				</div>
			}
		>
			<MeetingLive
				attendees={attendees}
				kpis={activeKpis}
				given={state.given}
				selectedKpi={selectedKpi}
				onSelectKpi={(kpiId) => dispatch({ type: "selectKpi", kpiId })}
				onGive={handleGive}
			/>

			<p aria-live="polite" className="sr-only">
				{announcement}
			</p>
		</MeetingShell>
	);
}

function MeetingStat({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col items-start gap-1 leading-none sm:items-end">
			<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
				{label}
			</span>
			{children}
		</div>
	);
}
