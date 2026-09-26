import { Badge } from "@kpi-corp/ui/components/badge";

export function StreakBadge({ weeks }: { weeks: number }) {
	const label = `${weeks} ${weeks === 1 ? "semana" : "semanas"}`;

	return (
		<Badge
			variant="outline"
			className="border-warn/25 bg-warn/10 text-warn"
			aria-label={`Sequência de ${label}`}
		>
			<span aria-hidden>🔥</span>
			{label}
		</Badge>
	);
}
