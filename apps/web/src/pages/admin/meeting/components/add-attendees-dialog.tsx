import { Badge } from "@kpi-corp/ui/components/badge";
import { Button } from "@kpi-corp/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogTitle,
} from "@kpi-corp/ui/components/dialog";
import { Spinner } from "@kpi-corp/ui/components/spinner";
import { cn } from "@kpi-corp/ui/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { OverlayHeader } from "@/components/overlay-header";
import { UserAvatar } from "@/components/user-avatar";
import type { MeetingPerson } from "@/lib/meetings";
import type { Kpi } from "@/mocks/kpis";

export type AttendeeCandidate = MeetingPerson & { scheduled: boolean };

type AddAttendeesDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	candidates: AttendeeCandidate[];
	presenceKpis: Kpi[];
	pending: boolean;
	onConfirm: (userIds: string[], presenceKpiId: string) => void;
};

export function AddAttendeesDialog({
	open,
	onOpenChange,
	candidates,
	presenceKpis,
	pending,
	onConfirm,
}: AddAttendeesDialogProps) {
	const [selected, setSelected] = useState<string[]>([]);
	const [presenceKpiId, setPresenceKpiId] = useState<string | null>(
		presenceKpis.length === 1 ? (presenceKpis[0]?.id ?? null) : null,
	);

	const toggle = (id: string) =>
		setSelected((current) =>
			current.includes(id)
				? current.filter((item) => item !== id)
				: [...current, id],
		);

	const ready = selected.length > 0 && presenceKpiId !== null;

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) setSelected([]);
				onOpenChange(next);
			}}
		>
			<DialogContent
				showCloseButton={false}
				className="flex max-h-[85svh] flex-col gap-0 overflow-hidden rounded-lg bg-bg-1 p-0 sm:max-w-lg"
			>
				<OverlayHeader
					close={
						<DialogClose
							render={
								<Button
									type="button"
									variant="outline"
									size="icon"
									aria-label="Fechar adicionar participantes"
								/>
							}
						>
							<XIcon />
						</DialogClose>
					}
				>
					<DialogTitle className="font-semibold text-base text-foreground">
						Adicionar participantes
					</DialogTitle>
				</OverlayHeader>

				<div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
					<CandidateList
						candidates={candidates}
						selected={selected}
						onToggle={toggle}
					/>

					{presenceKpis.length > 1 && (
						<fieldset className="flex flex-col gap-2">
							<legend className="mb-2 font-medium text-2xs text-fg-3 uppercase tracking-widest">
								KPI de presença
							</legend>
							<div className="flex flex-wrap gap-2">
								{presenceKpis.map((kpi) => (
									<Button
										key={kpi.id}
										type="button"
										variant="outline"
										size="sm"
										aria-pressed={kpi.id === presenceKpiId}
										onClick={() => setPresenceKpiId(kpi.id)}
										className="rounded-full text-fg-1 aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary"
									>
										{kpi.name} · +{kpi.points}
									</Button>
								))}
							</div>
						</fieldset>
					)}
				</div>

				<DialogFooter className="shrink-0 border-t px-4 py-4 sm:px-6">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						disabled={!ready || pending}
						onClick={() => {
							if (presenceKpiId) onConfirm(selected, presenceKpiId);
						}}
					>
						{pending ? <Spinner data-icon="inline-start" /> : null}
						Marcar presença
						{selected.length > 0 ? ` (${selected.length})` : ""}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function CandidateList({
	candidates,
	selected,
	onToggle,
}: {
	candidates: AttendeeCandidate[];
	selected: string[];
	onToggle: (id: string) => void;
}) {
	if (candidates.length === 0) {
		return (
			<p className="text-fg-2 text-sm">Todo o time ativo já está na reunião.</p>
		);
	}

	return (
		<ul className="flex flex-col gap-2">
			{candidates.map((candidate) => {
				const on = selected.includes(candidate.id);

				return (
					<li key={candidate.id}>
						<button
							type="button"
							aria-pressed={on}
							onClick={() => onToggle(candidate.id)}
							className={cn(
								"flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
								on
									? "border-primary bg-primary-soft"
									: "border-border bg-card hover:bg-muted/50",
							)}
						>
							<UserAvatar name={candidate.name} />

							<div className="flex min-w-0 flex-1 flex-col leading-tight">
								<span className="truncate font-medium text-sm">
									{candidate.name}
								</span>
								<span className="truncate text-2xs text-fg-3">
									{candidate.position ?? "—"}
								</span>
							</div>

							{candidate.scheduled && (
								<Badge variant="outline" className="bg-bg-2 text-fg-2">
									escalado
								</Badge>
							)}

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
	);
}
