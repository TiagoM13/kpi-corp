import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ApiKpi, type KpiDraft, kpiInputOf, toKpi } from "@/lib/kpis";
import type { Kpi } from "@/mocks/kpis";
import { orpc } from "@/utils/orpc";

function selectKpis(data: { items: ApiKpi[] }): Kpi[] {
	return data.items.map(toKpi);
}

export function useKpis() {
	return useQuery({
		...orpc.kpis.list.queryOptions({ input: {} }),
		select: selectKpis,
	});
}

function useInvalidateKpis() {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: orpc.kpis.key() });
}

export function useSaveKpi(kpi: Kpi | null) {
	const invalidate = useInvalidateKpis();

	return useMutation({
		mutationFn: (draft: KpiDraft) => {
			const input = kpiInputOf(draft);
			return kpi
				? orpc.kpis.update.call({ id: kpi.id, ...input })
				: orpc.kpis.create.call(input);
		},
		onSuccess: invalidate,
	});
}

export function useToggleKpi() {
	const invalidate = useInvalidateKpis();

	return useMutation({
		...orpc.kpis.setStatus.mutationOptions(),
		onSuccess: invalidate,
	});
}
