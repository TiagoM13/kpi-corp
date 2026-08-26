import {
	ToggleGroup,
	ToggleGroupItem,
} from "@kpi-corp/ui/components/toggle-group";
import { cn } from "@kpi-corp/ui/lib/utils";
import type { ReactNode } from "react";

export type SegmentedOption<T extends string> = {
	value: T;
	label: ReactNode;
	srLabel?: string;
};

type SegmentedControlProps<T extends string> = {
	label: string;
	value: T;
	options: SegmentedOption<T>[];
	onValueChange: (value: T) => void;
	className?: string;
};

export function SegmentedControl<T extends string>({
	label,
	value,
	options,
	onValueChange,
	className,
}: SegmentedControlProps<T>) {
	return (
		<div className={cn("rounded-sm border bg-bg-2 p-0.75", className)}>
			<ToggleGroup
				spacing={0}
				aria-label={label}
				value={[value]}
				onValueChange={(next) => {
					const [selected] = next as T[];
					if (selected) onValueChange(selected);
				}}
			>
				{options.map((option) => (
					<ToggleGroupItem
						key={option.value}
						value={option.value}
						aria-label={option.srLabel}
						className="text-fg-2 aria-pressed:bg-bg-3 aria-pressed:text-foreground"
					>
						{option.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
