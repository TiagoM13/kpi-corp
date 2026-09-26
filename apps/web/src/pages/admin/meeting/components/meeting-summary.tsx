import { Button } from "@kpi-corp/ui/components/button";
import { PlayIcon } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { type MeetingDetail, shortNameOf } from "@/lib/meetings";

const MEDALS = ["🥇", "🥈", "🥉"];

type MeetingSummaryViewProps = {
	title: string;
	duration: string;
	attributions: number;
	summary: MeetingDetail["summary"];
	onExit: () => void;
	onRestart: () => void;
};

function plural(total: number, one: string, many: string) {
	return `${total} ${total === 1 ? one : many}`;
}

export function MeetingSummaryView({
	title,
	duration,
	attributions,
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
				Reconhecimento registrado.
			</h2>

			<p className="text-balance text-fg-2 text-sm">
				{title} · {duration} ·{" "}
				{plural(attributions, "atribuição", "atribuições")},{" "}
				{plural(summary.totalPoints, "ponto", "pontos")} no total.
			</p>

			{summary.podium.length > 0 && (
				<ol
					aria-label="Pódio da reunião"
					className="flex flex-wrap justify-center gap-3"
				>
					{summary.podium.map((entry, index) => (
						<li
							key={entry.userId}
							style={{ animationDelay: `${index * 120}ms` }}
							className="flex w-40 min-w-0 flex-col items-center gap-2 rounded-lg border bg-card p-4 motion-safe:animate-podium-enter"
						>
							<span aria-hidden className="text-2xl">
								{MEDALS[index]}
							</span>
							<UserAvatar name={entry.name} className="size-12 text-base" />
							<span className="max-w-full truncate font-medium text-sm">
								{shortNameOf(entry.name)}
							</span>
							<span className="font-bold text-primary text-title tabular-nums">
								+{entry.points}
							</span>
						</li>
					))}
				</ol>
			)}

			<p className="max-w-md text-balance text-2xs text-fg-3">
				Tudo o que foi atribuído já está gravado: pontos, ranking e painel
				refletem esta reunião.
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
