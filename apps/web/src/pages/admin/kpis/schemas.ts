import { z } from "zod";
import { KPI_CATEGORY_IDS, type Kpi } from "@/mocks/kpis";
import {
	DEFAULT_CATEGORY,
	DEFAULT_POINTS,
	MAX_DESCRIPTION_LENGTH,
	MAX_NAME_LENGTH,
	MAX_POINTS,
	MIN_POINTS,
} from "./constants";

export const kpiFormSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Informe o nome do KPI.")
		.max(MAX_NAME_LENGTH, `Máximo de ${MAX_NAME_LENGTH} caracteres.`),
	description: z
		.string()
		.trim()
		.max(
			MAX_DESCRIPTION_LENGTH,
			`Máximo de ${MAX_DESCRIPTION_LENGTH} caracteres.`,
		),
	category: z.enum(KPI_CATEGORY_IDS),
	points: z
		.number({ error: "Informe quantos pontos o KPI vale." })
		.int("Use um número inteiro.")
		.min(MIN_POINTS, `Mínimo de ${MIN_POINTS} ponto.`)
		.max(MAX_POINTS, `Máximo de ${MAX_POINTS} pontos.`),
});

export type KpiFormValues = z.infer<typeof kpiFormSchema>;

export function kpiFormDefaults(kpi: Kpi | null): KpiFormValues {
	if (!kpi) {
		return {
			name: "",
			description: "",
			category: DEFAULT_CATEGORY,
			points: DEFAULT_POINTS,
		};
	}

	return {
		name: kpi.name,
		description: kpi.description,
		category: kpi.category,
		points: kpi.points,
	};
}
