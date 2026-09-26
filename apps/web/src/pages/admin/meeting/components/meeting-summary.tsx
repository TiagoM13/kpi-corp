import { Button } from "@kpi-corp/ui/components/button";
import { PlayIcon } from "lucide-react";

// Pódio e total de pontos voltam quando a API entregar o resumo (MT02 em docs/pendencias-api.md).
// import { UserAvatar } from "@/components/user-avatar";
// const MEDALS = ["🥇", "🥈", "🥉"];

type MeetingSummaryViewProps = {
	title: string;
	duration: string;
	present: number;
	attributions: number;
	onExit: () => void;
	onRestart: () => void;
};

export function MeetingSummaryView({
	title,
	duration,
	present,
	attributions,
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
				{title} · {duration} · {present}{" "}
				{present === 1 ? "presente" : "presentes"} · {attributions}{" "}
				{attributions === 1 ? "atribuição" : "atribuições"}.
			</p>

			{/*
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
			*/}

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
