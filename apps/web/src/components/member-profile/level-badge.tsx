import { Badge } from "@kpi-corp/ui/components/badge";

export function LevelBadge({ level }: { level: number }) {
	return (
		<Badge
			variant="outline"
			className="bg-bg-2 text-fg-1"
			aria-label={`Nível ${level}`}
		>
			<span aria-hidden className="size-1.5 rounded-full bg-primary" />
			nv {level}
		</Badge>
	);
}
