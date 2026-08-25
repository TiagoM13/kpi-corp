import { Button } from "@kpi-corp/ui/components/button";
import { FieldError } from "@kpi-corp/ui/components/field";
import { type Control, useController } from "react-hook-form";
import { KPI_CATEGORIES } from "@/mocks/kpis";
import type { KpiFormValues } from "../schemas";

export function KpiCategoryField({
	control,
}: {
	control: Control<KpiFormValues>;
}) {
	const { field, fieldState } = useController({ control, name: "category" });

	return (
		<fieldset className="flex flex-col gap-2">
			<legend className="mb-2 font-medium text-fg-1 text-xs">Categoria</legend>

			<div className="grid grid-cols-2 gap-2">
				{KPI_CATEGORIES.map((category) => {
					const selected = field.value === category.id;

					return (
						<Button
							key={category.id}
							type="button"
							variant="outline"
							aria-pressed={selected}
							onClick={() => field.onChange(category.id)}
							className="justify-start gap-2 text-fg-1"
							style={
								selected
									? {
											color: category.color,
											borderColor: category.color,
											backgroundColor: `color-mix(in oklab, ${category.color} 14%, transparent)`,
										}
									: undefined
							}
						>
							<span
								aria-hidden
								className="size-1.5 shrink-0 rounded-full"
								style={{ backgroundColor: category.color }}
							/>
							{category.label}
						</Button>
					);
				})}
			</div>

			{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
		</fieldset>
	);
}
