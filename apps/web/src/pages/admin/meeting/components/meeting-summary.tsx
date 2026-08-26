import { Button } from "@kpi-corp/ui/components/button";
import { PlayIcon } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { formatElapsed, type MeetingSummary } from "@/lib/meeting";

const MEDALS = ["🥇", "🥈", "🥉"];

type MeetingSummaryViewProps = {
	title: string;
	elapsed: number;
	summary: MeetingSummary;
	onExit: () => void;
	onRestart: () => void;
};

export function MeetingSummaryView({
	title,
	elapsed,
	summary,
	onExit,
	onRestart,
}: MeetingSummaryViewProps) {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 pt-8 text-center">
			<span aria-hidden className="text-6xl">
				🎉
			</span>

			<h2 className="text-balance font-bold text-heading tracking-tight">
				Reunião encerrada.
			</h2>

			<p className="text-balance text-fg-2 text-sm">
				{title} · {formatElapsed(elapsed)} · {summary.attributions}{" "}
				{summary.attributions === 1 ? "atribuição" : "atribuições"},{" "}
				{summary.totalPoints} pontos no total.
			</p>

			{summary.podium.length > 0 && (
				<ol className="flex flex-wrap justify-center gap-3">
					{summary.podium.map((entry, index) => (
						<li
							key={entry.member.id}
							style={{ animationDelay: `${index * 120}ms` }}
							className="flex w-40 flex-col items-center gap-2 rounded-lg border bg-card p-4 motion-safe:animate-podium-enter"
						>
							<span aria-hidden className="text-2xl">
								{MEDALS[index]}
							</span>
							<UserAvatar
								name={entry.member.name}
								hue={entry.member.hue}
								className="size-12 text-base"
							/>
							<span className="truncate font-medium text-sm">
								{entry.member.name}
							</span>
							<span className="font-bold text-primary text-title tabular-nums">
								+{entry.points}
							</span>
						</li>
					))}
				</ol>
			)}

			<p className="max-w-md text-balance text-2xs text-fg-3">
				O resultado desta reunião ainda não é gravado — pontos, usos de KPI e
				feed de atividade seguem como estavam.
			</p>

			<div className="flex flex-col gap-2 sm:flex-row">
				<Button type="button" variant="outline" onClick={onExit}>
					Voltar ao painel
				</Button>
				<Button type="button" onClick={onRestart}>
					<PlayIcon data-icon="inline-start" />
					Nova reunião
				</Button>
			</div>
		</div>
	);
}
