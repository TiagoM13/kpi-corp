import { Button } from "@kpi-corp/ui/components/button";
import { Input } from "@kpi-corp/ui/components/input";
import { cn } from "@kpi-corp/ui/lib/utils";
import { CheckIcon, ClockIcon, PlayIcon, UsersIcon } from "lucide-react";
import { useId } from "react";
import { UserAvatar } from "@/components/user-avatar";
import type { Kpi } from "@/mocks/kpis";
import type { Member } from "@/mocks/members";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
	dateStyle: "long",
	timeStyle: "short",
});

type MeetingSetupProps = {
	title: string;
	members: Member[];
	present: string[];
	presenceKpi?: Kpi;
	startedAt: Date;
	onTitleChange: (title: string) => void;
	onToggle: (memberId: string) => void;
	onMarkAll: () => void;
	onClear: () => void;
	onStart: () => void;
};

export function MeetingSetup({
	title,
	members,
	present,
	presenceKpi,
	startedAt,
	onTitleChange,
	onToggle,
	onMarkAll,
	onClear,
	onStart,
}: MeetingSetupProps) {
	const titleId = useId();
	const selected = new Set(present);
	const ready = present.length > 0;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
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
								<UserAvatar name={member.name} hue={member.hue} />

								<div className="flex min-w-0 flex-1 flex-col leading-tight">
									<span className="truncate font-medium text-sm">
										{member.name}
									</span>
									<span className="truncate text-2xs text-fg-3">
										{member.position}
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
					{ready
						? `Pronto pra começar com ${present.length} ${present.length === 1 ? "pessoa" : "pessoas"}`
						: "Selecione ao menos uma pessoa"}
				</span>

				<Button type="button" size="lg" disabled={!ready} onClick={onStart}>
					<PlayIcon data-icon="inline-start" />
					Iniciar reunião
				</Button>
			</div>
		</div>
	);
}
