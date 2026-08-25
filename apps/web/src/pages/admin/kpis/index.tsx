import { Button } from "@kpi-corp/ui/components/button";
import { PlusIcon } from "lucide-react";
import {
	lazy,
	Suspense,
	useCallback,
	useDeferredValue,
	useMemo,
	useState,
} from "react";
import {
	countActive,
	EMPTY_KPI_FILTERS,
	filterKpis,
	type KpiFilters,
} from "@/lib/kpi-filters";
import { selectKpis, useKpiStore } from "@/lib/kpi-store";
import type { Kpi } from "@/mocks/kpis";
import { KpiFiltersBar, type KpiView } from "./components/kpi-filters-bar";
import { KpiResults } from "./components/kpi-results";

const KpiEditorDialog = lazy(() =>
	import("./components/kpi-editor-dialog").then((module) => ({
		default: module.KpiEditorDialog,
	})),
);

export function AdminKpisPage() {
	const allKpis = useKpiStore(selectKpis);

	const [filters, setFilters] = useState<KpiFilters>(EMPTY_KPI_FILTERS);
	const [view, setView] = useState<KpiView>("grid");
	const [editorLoaded, setEditorLoaded] = useState(false);
	const [editorOpen, setEditorOpen] = useState(false);
	const [editing, setEditing] = useState<Kpi | null>(null);

	const deferredFilters = useDeferredValue(filters);
	const kpis = useMemo(
		() => filterKpis(allKpis, deferredFilters),
		[allKpis, deferredFilters],
	);
	const activeCount = useMemo(() => countActive(allKpis), [allKpis]);

	const updateFilters = useCallback((patch: Partial<KpiFilters>) => {
		setFilters((current) => ({ ...current, ...patch }));
	}, []);

	const clearFilters = useCallback(() => setFilters(EMPTY_KPI_FILTERS), []);

	const openEditor = useCallback((kpi: Kpi | null) => {
		setEditing(kpi);
		setEditorLoaded(true);
		setEditorOpen(true);
	}, []);

	const createKpi = useCallback(() => openEditor(null), [openEditor]);

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex flex-col gap-2">
					<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
						Banco de KPIs
					</span>
					<h1 className="font-bold text-title tracking-tight sm:text-heading">
						{activeCount} indicadores ativos
					</h1>
					<p className="text-fg-2 text-sm">O que vale ponto na sua empresa.</p>
				</div>

				<Button
					type="button"
					onClick={createKpi}
					className="sm:self-start lg:self-auto"
				>
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

			<KpiResults
				kpis={kpis}
				view={view}
				onEdit={openEditor}
				onClearFilters={clearFilters}
			/>

			{editorLoaded && (
				<Suspense fallback={null}>
					<KpiEditorDialog
						key={editing?.id ?? "new"}
						kpi={editing}
						open={editorOpen}
						onOpenChange={setEditorOpen}
					/>
				</Suspense>
			)}
		</div>
	);
}
