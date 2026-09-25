import { cn } from "@kpi-corp/ui/lib/utils";

import { hueFor } from "@/lib/avatar";

function initialsOf(name: string) {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase();
}

type UserAvatarProps = {
	name: string;
	hue?: number;
	className?: string;
};

export function UserAvatar({
	name,
	hue = hueFor(name),
	className,
}: UserAvatarProps) {
	return (
		<span
			aria-hidden
			className={cn(
				"inline-flex size-7 shrink-0 items-center justify-center rounded-full font-semibold text-white text-xs",
				className,
			)}
			style={{
				background: `linear-gradient(135deg, oklch(72% 0.18 ${hue}), oklch(48% 0.14 ${(hue + 30) % 360}))`,
				textShadow: "0 1px 2px rgb(0 0 0 / 0.3)",
			}}
		>
			{initialsOf(name)}
		</span>
	);
}
