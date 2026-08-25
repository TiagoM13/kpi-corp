import { cn } from "@kpi-corp/ui/lib/utils";
import type { ReactNode } from "react";

type OverlayHeaderProps = {
	children: ReactNode;
	close: ReactNode;
	className?: string;
};

export function OverlayHeader({
	children,
	close,
	className,
}: OverlayHeaderProps) {
	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-between gap-3 border-b px-4 py-4 sm:px-6",
				className,
			)}
		>
			{children}
			{close}
		</div>
	);
}
