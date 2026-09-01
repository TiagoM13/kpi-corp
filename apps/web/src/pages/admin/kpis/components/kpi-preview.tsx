import { type Control, useWatch } from "react-hook-form";
import { KpiTile } from "@/components/kpi-tile";
import { DEFAULT_CATEGORY } from "../constants";
import type { KpiFormValues } from "../schemas";

export function KpiPreview({ control }: { control: Control<KpiFormValues> }) {
	const values = useWatch({ control });

	return (
		<div className="flex flex-col gap-2">
			<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
				Pré-visualização
			</span>

			<KpiTile
				kpi={{
					id: "preview",
					name: values.name?.trim() || "Nome do KPI",
					description:
						values.description?.trim() || "A descrição aparece aqui.",
					category: values.category ?? DEFAULT_CATEGORY,
					points: values.points || 0,
					uses: 0,
					active: true,
				}}
			/>
		</div>
	);
}
