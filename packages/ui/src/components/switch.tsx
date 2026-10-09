"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@kpi-corp/ui/lib/utils";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				"peer relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full border border-transparent bg-input outline-none transition-colors after:absolute after:-inset-x-2 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-checked:bg-primary data-disabled:opacity-50 dark:bg-input/80 dark:data-checked:bg-primary",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className="pointer-events-none block size-3.5 translate-x-0.5 rounded-full bg-background shadow-sm ring-0 transition-transform data-checked:translate-x-3.5 dark:bg-foreground dark:data-checked:bg-primary-foreground"
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
