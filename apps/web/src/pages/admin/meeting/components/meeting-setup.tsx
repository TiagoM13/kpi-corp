import { Button } from "@kpi-corp/ui/components/button";
import { Input } from "@kpi-corp/ui/components/input";
import { Spinner } from "@kpi-corp/ui/components/spinner";
import { cn } from "@kpi-corp/ui/lib/utils";
import {
	CheckIcon,
	ClockIcon,
	PlayIcon,
	RotateCwIcon,
	UsersIcon,
} from "lucide-react";
import { useId } from "react";
import { UserAvatar } from "@/components/user-avatar";
import type { MeetingPerson, OpenMeeting } from "@/lib/meetings";
import type { Kpi } from "@/mocks/kpis";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
	dateStyle: "long",
	timeStyle: "short",
});

type MeetingSetupProps = {
	title: string;
	members: MeetingPerson[];
	present: string[];
	presenceKpis: Kpi[];
	presenceKpiId: string | null;
	openMeetings: OpenMeeting[];
	startedAt: Date;
	starting: boolean;
	onTitleChange: (title: string) => void;
	onPresenceKpiChange: (kpiId: string) => void;
	onToggle: (memberId: string) => void;
	onMarkAll: () => void;
	onClear: () => void;
	onStart: () => void;
	onContinue: (meetingId: string) => void;
};

export function MeetingSetup({
	title,
	members,
	present,
	presenceKpis,
	presenceKpiId,
	openMeetings,
	startedAt,
	starting,
	onTitleChange,
	onPresenceKpiChange,
	onToggle,
	onMarkAll,
	onClear,
	onStart,
	onContinue,
}: MeetingSetupProps) {
	const titleId = useId();
	const selected = new Set(present);
	const presenceKpi = presenceKpis.find((kpi) => kpi.id === presenceKpiId);
	const ready = present.length > 0 && presenceKpi !== undefined;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
			<OpenMeetings meetings={openMeetings} onContinue={onContinue} />

			<div className="flex flex-col gap-3">
				<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
					Passo 1 de 2 · Marque os presentes
				</span>

				<label htmlFor={titleId} className="sr-only">
					Título da reunião
				</label>
				<Input
					id={titleId}
					value={title}
					onChange={(event) => onTitleChange(event.target.value)}
					placeholder="Título da reunião"
					className="h-14 font-semibold text-title tracking-tight md:text-heading"
				/>

				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-2 text-xs">
					<span className="inline-flex items-center gap-1.5">
						<ClockIcon aria-hidden className="size-3.5" />
						{dateFormat.format(startedAt)}
					</span>
					<span aria-hidden>·</span>
					<span className="inline-flex items-center gap-1.5">
						<UsersIcon aria-hidden className="size-3.5" />
						<b className="text-foreground tabular-nums">{present.length}</b> de{" "}
						{members.length} marcados
					</span>
					{presenceKpi && (
						<>
							<span aria-hidden>·</span>
							<span>
								vai dar <b className="text-primary">+{presenceKpi.points}</b> de
								presença pra cada um
							</span>
						</>
					)}
				</div>
			</div>

			<PresenceKpiField
				kpis={presenceKpis}
				selectedId={presenceKpiId}
				onSelect={onPresenceKpiChange}
			/>

			<div className="flex gap-2">
				<Button type="button" variant="outline" size="sm" onClick={onMarkAll}>
					Marcar todos
				</Button>
				<Button type="button" variant="outline" size="sm" onClick={onClear}>
					Limpar
				</Button>
			</div>

			<ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{members.map((member) => {
					const on = selected.has(member.id);

					return (
						<li key={member.id}>
							<button
								type="button"
								aria-pressed={on}
								onClick={() => onToggle(member.id)}
								className={cn(
									"flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
									on
										? "border-primary bg-primary-soft"
										: "border-border bg-card hover:bg-muted/50",
								)}
							>
								<UserAvatar name={member.name} />

								<div className="flex min-w-0 flex-1 flex-col leading-tight">
									<span className="truncate font-medium text-sm">
										{member.name}
									</span>
									<span className="truncate text-2xs text-fg-3">
										{member.position ?? "—"}
									</span>
								</div>

								<span
									aria-hidden
									className={cn(
										"grid size-4.5 shrink-0 place-items-center rounded-xs border",
										on
											? "border-primary bg-primary text-primary-foreground"
											: "border-line-2",
									)}
								>
									{on && <CheckIcon className="size-3" />}
								</span>
							</button>
						</li>
					);
				})}
			</ul>

			<div className="sticky bottom-0 flex flex-col gap-3 border-t bg-background py-4 sm:flex-row sm:items-center sm:justify-between">
				<span className="text-fg-2 text-sm">
					<StartHint
						count={present.length}
						hasPresenceKpi={presenceKpi !== undefined}
					/>
				</span>

				<Button
					type="button"
					size="lg"
					disabled={!ready || starting}
					onClick={onStart}
				>
					{starting ? (
						<Spinner data-icon="inline-start" />
					) : (
						<PlayIcon data-icon="inline-start" />
					)}
					Iniciar reunião
				</Button>
			</div>
		</div>
	);
}

function StartHint({
	count,
	hasPresenceKpi,
}: {
	count: number;
	hasPresenceKpi: boolean;
}) {
	if (count === 0) return <>Selecione ao menos uma pessoa</>;
	if (!hasPresenceKpi) return <>Escolha o KPI de presença</>;

	return (
		<>
			Pronto pra começar com {count} {count === 1 ? "pessoa" : "pessoas"}
		</>
	);
}

function PresenceKpiField({
	kpis,
	selectedId,
	onSelect,
}: {
	kpis: Kpi[];
	selectedId: string | null;
	onSelect: (kpiId: string) => void;
}) {
	if (kpis.length === 0) {
		return (
			<p className="rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
				Nenhum KPI de presença ativo. Crie ou reative um na tela de KPIs para
				registrar presença.
			</p>
		);
	}

	return (
		<fieldset className="flex flex-col gap-2">
			<legend className="mb-2 font-medium text-2xs text-fg-3 uppercase tracking-widest">
				KPI de presença
			</legend>
			<div className="flex flex-wrap gap-2">
				{kpis.map((kpi) => (
					<Button
						key={kpi.id}
						type="button"
						variant="outline"
						size="sm"
						aria-pressed={kpi.id === selectedId}
						onClick={() => onSelect(kpi.id)}
						className="rounded-full text-fg-1 aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary"
					>
						{kpi.name} · +{kpi.points}
					</Button>
				))}
			</div>
		</fieldset>
	);
}

const openedFormat = new Intl.DateTimeFormat("pt-BR", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
});

function OpenMeetings({
	meetings,
	onContinue,
}: {
	meetings: OpenMeeting[];
	onContinue: (meetingId: string) => void;
}) {
	if (meetings.length === 0) return null;

	return (
		<section
			aria-label="Reuniões abertas"
			className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary-soft p-4"
		>
			<h2 className="font-medium text-2xs text-primary uppercase tracking-widest">
				{meetings.length === 1
					? "Tem uma reunião aberta"
					: `${meetings.length} reuniões abertas`}
			</h2>
			<ul className="flex flex-col gap-2">
				{meetings.map((meeting) => (
					<li
						key={meeting.id}
						className="flex flex-wrap items-center justify-between gap-3"
					>
						<span className="min-w-0 text-sm">
							<b className="font-semibold">{meeting.title}</b>
							<span className="text-fg-2">
								{" "}
								· {openedFormat.format(meeting.date)} · {meeting.presentCount}{" "}
								{meeting.presentCount === 1 ? "presente" : "presentes"}
							</span>
						</span>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => onContinue(meeting.id)}
						>
							<RotateCwIcon data-icon="inline-start" />
							Continuar
						</Button>
					</li>
				))}
			</ul>
		</section>
	);
}
