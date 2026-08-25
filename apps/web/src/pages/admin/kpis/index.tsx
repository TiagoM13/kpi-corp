import { Button } from "@kpi-corp/ui/components/button";
import { PlusIcon } from "lucide-react";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
	countActive,
	EMPTY_KPI_FILTERS,
	filterKpis,
	type KpiFilters,
} from "@/lib/kpi-filters";
import { MOCK_KPIS } from "@/mocks/kpis";
import { KpiFiltersBar, type KpiView } from "./components/kpi-filters-bar";
import { KpiResults } from "./components/kpi-results";

const ACTIVE_COUNT = countActive(MOCK_KPIS);

export function AdminKpisPage() {
	const [filters, setFilters] = useState<KpiFilters>(EMPTY_KPI_FILTERS);
	const [view, setView] = useState<KpiView>("grid");

	const deferredFilters = useDeferredValue(filters);
	const kpis = useMemo(
		() => filterKpis(MOCK_KPIS, deferredFilters),
		[deferredFilters],
	);

	const updateFilters = useCallback((patch: Partial<KpiFilters>) => {
		setFilters((current) => ({ ...current, ...patch }));
	}, []);

	const clearFilters = useCallback(() => setFilters(EMPTY_KPI_FILTERS), []);

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex flex-col gap-2">
					<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
						Banco de KPIs
					</span>
					<h1 className="font-bold text-title tracking-tight sm:text-heading">
						{ACTIVE_COUNT} indicadores ativos
					</h1>
					<p className="text-fg-2 text-sm">O que vale ponto na sua empresa.</p>
				</div>

				<Button type="button" className="self-start lg:self-auto">
					<PlusIcon data-icon="inline-start" />
					Novo KPI
				</Button>
			</header>

			<KpiFiltersBar
				filters={filters}
				onChange={updateFilters}
				view={view}
				onViewChange={setView}
			/>

			<KpiResults kpis={kpis} view={view} onClearFilters={clearFilters} />
		</div>
	);
}
