import { Button } from "@kpi-corp/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { Spinner } from "@kpi-corp/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { TriangleAlertIcon, Undo2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { toKpi } from "@/lib/kpis";
import { DEFAULT_MEETING_TITLE } from "@/lib/meeting";
import {
	activeAssignments,
	calendarDateOf,
	formatDuration,
	lastActiveAssignment,
	type MeetingDetail,
	type MeetingPerson,
	meetingErrorOf,
	presentAttendees,
} from "@/lib/meetings";
import type { Kpi } from "@/mocks/kpis";
import { orpc } from "@/utils/orpc";
import {
	AddAttendeesDialog,
	type AttendeeCandidate,
} from "./components/add-attendees-dialog";
import { EndMeetingDialog } from "./components/end-meeting-dialog";
import { MeetingLive } from "./components/meeting-live";
import { MeetingSetup } from "./components/meeting-setup";
import { MeetingShell } from "./components/meeting-shell";
import { MeetingSummaryView } from "./components/meeting-summary";
import { MeetingTimer } from "./components/meeting-timer";
import {
	useAssignMeetingKpi,
	useEndMeeting,
	useMeeting,
	useRegisterAttendance,
	useRevokeMeetingAssignment,
	useStartMeeting,
} from "./use-meeting";

const MAX_MEMBERS = 100;
const NO_PEOPLE: MeetingPerson[] = [];
const NO_KPIS: Kpi[] = [];

function useActiveMembers() {
	return useQuery({
		...orpc.members.list.queryOptions({
			input: { status: "ACTIVE", limit: MAX_MEMBERS },
		}),
		select: (data): MeetingPerson[] =>
			data.items.map((member) => ({
				id: member.id,
				name: member.name,
				position: member.position,
			})),
	});
}

function usePresenceKpis() {
	return useQuery({
		...orpc.kpis.list.queryOptions({
			input: { category: "PRESENCE", active: true },
		}),
		select: (data) => data.items.map(toKpi),
	});
}

function useActiveKpis() {
	return useQuery({
		...orpc.kpis.list.queryOptions({ input: { active: true } }),
		select: (data) => data.items.map(toKpi),
	});
}

function useNow(enabled: boolean) {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		if (!enabled) return;
		const timer = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(timer);
	}, [enabled]);

	return now;
}

function LoadingState({ label }: { label: string }) {
	return (
		<div
			aria-busy
			className="flex items-center justify-center gap-2 py-24 text-fg-2 text-sm"
		>
			<Spinner />
			{label}
		</div>
	);
}

function ErrorState({
	title,
	onRetry,
}: {
	title: string;
	onRetry: () => void;
}) {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<TriangleAlertIcon />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>Confira a conexão e tente de novo.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button type="button" variant="outline" onClick={onRetry}>
					Tentar de novo
				</Button>
			</EmptyContent>
		</Empty>
	);
}

type SetupStepProps = {
	onStarted: (meetingId: string) => void;
	onExit: () => void;
};

function SetupStep({ onStarted, onExit }: SetupStepProps) {
	const [title, setTitle] = useState(DEFAULT_MEETING_TITLE);
	const [present, setPresent] = useState<string[]>([]);
	const [chosenPresenceKpiId, setChosenPresenceKpiId] = useState<string | null>(
		null,
	);
	const [startedAt] = useState(() => new Date());

	const members = useActiveMembers();
	const presenceKpis = usePresenceKpis();
	const openMeetings = useQuery(
		orpc.meetings.list.queryOptions({ input: { status: "OPEN" } }),
	);
	const start = useStartMeeting();

	const presenceKpiList = presenceKpis.data ?? NO_KPIS;
	const presenceKpiId =
		chosenPresenceKpiId ??
		(presenceKpiList.length === 1 ? (presenceKpiList[0]?.id ?? null) : null);

	const toggle = useCallback(
		(memberId: string) =>
			setPresent((current) =>
				current.includes(memberId)
					? current.filter((id) => id !== memberId)
					: [...current, memberId],
			),
		[],
	);

	const handleStart = () => {
		if (!presenceKpiId) return;

		start.mutate(
			{
				title: title.trim() || DEFAULT_MEETING_TITLE,
				date: calendarDateOf(new Date()),
				userIds: present,
				presenceKpiId,
			},
			{
				onSuccess: ({ meetingId, attendanceError }) => {
					if (attendanceError) {
						toast.error(
							meetingErrorOf(
								attendanceError,
								"A reunião foi criada, mas a presença não foi registrada. Marque de novo em Adicionar participantes.",
							),
						);
					}
					onStarted(meetingId);
				},
				onError: (error) =>
					toast.error(
						meetingErrorOf(
							error,
							"Não deu para criar a reunião. Tente de novo.",
						),
					),
			},
		);
	};

	return (
		<MeetingShell title={title} onExit={onExit}>
			<SetupContent
				members={members}
				presenceKpis={presenceKpis}
				render={(people, kpis) => (
					<MeetingSetup
						title={title}
						members={people}
						present={present}
						presenceKpis={kpis}
						presenceKpiId={presenceKpiId}
						openMeetings={openMeetings.data?.items ?? []}
						startedAt={startedAt}
						starting={start.isPending}
						onTitleChange={setTitle}
						onPresenceKpiChange={setChosenPresenceKpiId}
						onToggle={toggle}
						onMarkAll={() => setPresent(people.map((person) => person.id))}
						onClear={() => setPresent([])}
						onStart={handleStart}
						onContinue={onStarted}
					/>
				)}
			/>
		</MeetingShell>
	);
}

function SetupContent({
	members,
	presenceKpis,
	render,
}: {
	members: ReturnType<typeof useActiveMembers>;
	presenceKpis: ReturnType<typeof usePresenceKpis>;
	render: (people: MeetingPerson[], kpis: Kpi[]) => ReactNode;
}) {
	if (members.isPending || presenceKpis.isPending) {
		return <LoadingState label="Carregando o time…" />;
	}

	if (members.isError || presenceKpis.isError) {
		return (
			<ErrorState
				title="Não deu para carregar o time"
				onRetry={() => {
					void members.refetch();
					void presenceKpis.refetch();
				}}
			/>
		);
	}

	return <>{render(members.data, presenceKpis.data)}</>;
}

type LiveStepProps = {
	meeting: MeetingDetail;
	onExit: () => void;
};

function LiveStep({ meeting, onExit }: LiveStepProps) {
	const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
	const [announcement, setAnnouncement] = useState("");
	const [addOpen, setAddOpen] = useState(false);
	const [endOpen, setEndOpen] = useState(false);
	const now = useNow(true);

	const kpis = useActiveKpis();
	const members = useActiveMembers();
	const presenceKpis = usePresenceKpis();
	const assign = useAssignMeetingKpi(meeting.id);
	const revoke = useRevokeMeetingAssignment(meeting.id);
	const attendance = useRegisterAttendance(meeting.id);
	const end = useEndMeeting(meeting.id);

	const attendees = useMemo(() => presentAttendees(meeting), [meeting]);
	const given = useMemo(() => activeAssignments(meeting), [meeting]);
	const kpiList = kpis.data ?? NO_KPIS;
	const selectedKpi = kpiList.find((kpi) => kpi.id === selectedKpiId) ?? null;

	const candidates = useMemo<AttendeeCandidate[]>(() => {
		const presentIds = new Set(attendees.map((person) => person.id));
		const scheduledIds = new Set(
			meeting.attendees
				.filter((attendee) => attendee.presentAt === null)
				.map((attendee) => attendee.userId),
		);

		return (members.data ?? NO_PEOPLE)
			.filter((person) => !presentIds.has(person.id))
			.map((person) => ({ ...person, scheduled: scheduledIds.has(person.id) }));
	}, [attendees, meeting.attendees, members.data]);

	const handleGive = (memberId: string) => {
		if (!selectedKpi) return;
		const person = attendees.find((attendee) => attendee.id === memberId);

		assign.mutate(
			{ kpiId: selectedKpi.id, userId: memberId },
			{
				onSuccess: () =>
					setAnnouncement(
						`${person?.name ?? "Membro"} ganhou ${selectedKpi.name}, mais ${selectedKpi.points} pontos.`,
					),
				onError: (error) =>
					toast.error(meetingErrorOf(error, "Não deu para dar o KPI.")),
			},
		);
	};

	const lastGiven = lastActiveAssignment(meeting);

	const handleUndo = () => {
		if (!lastGiven) return;

		revoke.mutate(lastGiven.id, {
			onSuccess: () =>
				toast.success(
					`Desfeito: ${lastGiven.kpi.name} de quem recebeu por último`,
				),
			onError: (error) =>
				toast.error(meetingErrorOf(error, "Não deu para desfazer.")),
		});
	};

	const handleAddAttendees = (userIds: string[], presenceKpiId: string) => {
		attendance.mutate(
			{ userIds, presenceKpiId },
			{
				onSuccess: () => {
					toast.success(
						userIds.length === 1
							? "Presença marcada"
							: `${userIds.length} presenças marcadas`,
					);
					setAddOpen(false);
				},
				onError: (error) =>
					toast.error(meetingErrorOf(error, "Não deu para marcar a presença.")),
			},
		);
	};

	const handleEnd = () => {
		end.mutate(undefined, {
			onSuccess: () => setEndOpen(false),
			onError: (error) =>
				toast.error(meetingErrorOf(error, "Não deu para encerrar a reunião.")),
		});
	};

	const elapsed = Math.max(
		0,
		Math.floor((now.getTime() - meeting.createdAt.getTime()) / 1000),
	);

	return (
		<MeetingShell
			title={meeting.title}
			onExit={onExit}
			live={
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
					<div className="flex flex-wrap items-center gap-6 sm:gap-4">
						<MeetingStat label="Tempo">
							<MeetingTimer elapsed={elapsed} />
						</MeetingStat>
						<MeetingStat label="Presentes">
							<span className="font-bold text-lg tabular-nums">
								{attendees.length}
							</span>
						</MeetingStat>
						<MeetingStat label="Reconhecimentos">
							<span className="font-bold text-lg text-primary tabular-nums">
								{given.length}
							</span>
						</MeetingStat>
					</div>

					<div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4">
						<Button
							type="button"
							variant="outline"
							disabled={!lastGiven || revoke.isPending}
							onClick={handleUndo}
							className="w-full sm:w-auto"
						>
							<Undo2Icon data-icon="inline-start" />
							Desfazer
						</Button>

						<Button
							type="button"
							onClick={() => setEndOpen(true)}
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
				kpis={kpiList}
				given={given}
				selectedKpi={selectedKpi}
				givingTo={assign.isPending ? (assign.variables?.userId ?? null) : null}
				onSelectKpi={setSelectedKpiId}
				onGive={handleGive}
				onAddAttendees={() => setAddOpen(true)}
			/>

			<p aria-live="polite" className="sr-only">
				{announcement}
			</p>

			{addOpen && (
				<AddAttendeesDialog
					open={addOpen}
					onOpenChange={setAddOpen}
					candidates={candidates}
					presenceKpis={presenceKpis.data ?? NO_KPIS}
					pending={attendance.isPending}
					onConfirm={handleAddAttendees}
				/>
			)}

			<EndMeetingDialog
				open={endOpen}
				onOpenChange={setEndOpen}
				pending={end.isPending}
				onConfirm={handleEnd}
			/>
		</MeetingShell>
	);
}

type MeetingRoomProps = {
	meetingId: string;
	onExit: () => void;
	onNewMeeting: () => void;
};

function MeetingRoom({ meetingId, onExit, onNewMeeting }: MeetingRoomProps) {
	const { data, isPending, isError, refetch } = useMeeting(meetingId);

	if (isPending) {
		return (
			<MeetingShell title="Modo reunião" onExit={onExit}>
				<LoadingState label="Abrindo a reunião…" />
			</MeetingShell>
		);
	}

	if (isError) {
		return (
			<MeetingShell title="Modo reunião" onExit={onExit}>
				<ErrorState
					title="Não deu para abrir a reunião"
					onRetry={() => void refetch()}
				/>
			</MeetingShell>
		);
	}

	if (data.status === "CLOSED") {
		return (
			<MeetingShell title={data.title} onExit={onExit}>
				<MeetingSummaryView
					title={data.title}
					duration={formatDuration(data.createdAt, data.closedAt ?? new Date())}
					present={presentAttendees(data).length}
					attributions={activeAssignments(data).length}
					onExit={onExit}
					onRestart={onNewMeeting}
				/>
			</MeetingShell>
		);
	}

	return <LiveStep meeting={data} onExit={onExit} />;
}

type AdminMeetingPageProps = {
	meetingId?: string;
	onMeetingChange: (meetingId: string | undefined) => void;
	onExit: () => void;
};

export function AdminMeetingPage({
	meetingId,
	onMeetingChange,
	onExit,
}: AdminMeetingPageProps) {
	if (!meetingId) {
		return <SetupStep onStarted={onMeetingChange} onExit={onExit} />;
	}

	return (
		<MeetingRoom
			meetingId={meetingId}
			onExit={onExit}
			onNewMeeting={() => onMeetingChange(undefined)}
		/>
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
