import { formatElapsed } from "@/lib/meeting";

export function MeetingTimer({ elapsed }: { elapsed: number }) {
	return (
		<span className="font-bold text-lg tabular-nums">
			{formatElapsed(elapsed)}
		</span>
	);
}
