import { Button } from "@kpi-corp/ui/components/button";
import { Field, FieldError, FieldLabel } from "@kpi-corp/ui/components/field";
import { Input } from "@kpi-corp/ui/components/input";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useId } from "react";
import { type Control, useController } from "react-hook-form";
import { MAX_POINTS, MIN_POINTS, POINT_SUGGESTIONS } from "../constants";
import type { KpiFormValues } from "../schemas";

function clamp(value: number) {
	return Math.min(MAX_POINTS, Math.max(MIN_POINTS, value));
}

export function KpiPointsField({
	control,
}: {
	control: Control<KpiFormValues>;
}) {
	const pointsId = useId();
	const { field, fieldState } = useController({ control, name: "points" });
	const current = Number.isNaN(field.value) ? MIN_POINTS : field.value;

	return (
		<Field data-invalid={fieldState.error ? true : undefined}>
			<FieldLabel htmlFor={pointsId}>Pontos</FieldLabel>

			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="icon"
					aria-label="Diminuir um ponto"
					onClick={() => field.onChange(clamp(current - 1))}
				>
					<MinusIcon />
				</Button>

				<Input
					id={pointsId}
					type="number"
					inputMode="numeric"
					min={MIN_POINTS}
					max={MAX_POINTS}
					className="w-20 text-center tabular-nums"
					aria-invalid={fieldState.error ? true : undefined}
					ref={field.ref}
					name={field.name}
					value={Number.isNaN(field.value) ? "" : field.value}
					onBlur={field.onBlur}
					onChange={(event) => field.onChange(event.target.valueAsNumber)}
				/>

				<Button
					type="button"
					variant="outline"
					size="icon"
					aria-label="Aumentar um ponto"
					onClick={() => field.onChange(clamp(current + 1))}
				>
					<PlusIcon />
				</Button>

				<div className="flex flex-wrap gap-1.5">
					{POINT_SUGGESTIONS.map((suggestion) => (
						<Button
							key={suggestion}
							type="button"
							variant="outline"
							size="xs"
							aria-pressed={field.value === suggestion}
							onClick={() => field.onChange(suggestion)}
							className="rounded-full text-fg-1 aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary"
						>
							+{suggestion}
						</Button>
					))}
				</div>
			</div>

			{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
		</Field>
	);
}
