import { Button } from "@kpi-corp/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { Skeleton } from "@kpi-corp/ui/components/skeleton";
import { PlusIcon, TriangleAlertIcon } from "lucide-react";
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
import type { Kpi } from "@/mocks/kpis";
import { KpiFiltersBar, type KpiView } from "./components/kpi-filters-bar";
import { KpiResults } from "./components/kpi-results";
import { useKpis } from "./use-kpis";

const KpiEditorDialog = lazy(() =>
	import("./components/kpi-editor-dialog").then((module) => ({
		default: module.KpiEditorDialog,
	})),
);

const NO_KPIS: Kpi[] = [];
const SKELETON_TILES = ["a", "b", "c", "d", "e", "f"];

function KpisSkeleton() {
	return (
		<div aria-busy className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			<span className="sr-only">Carregando KPIs…</span>
			{SKELETON_TILES.map((tile) => (
				<Skeleton key={tile} className="h-36 rounded-lg" />
			))}
		</div>
	);
}

function KpisError({ onRetry }: { onRetry: () => void }) {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<TriangleAlertIcon />
				</EmptyMedia>
				<EmptyTitle>Não deu para carregar os KPIs</EmptyTitle>
				<EmptyDescription>Confira a conexão e tente de novo.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button type="button" variant="outline" onClick={onRetry}>
					Tentar de novo
				</Button>
			</EmptyContent>
		</Empty>
	);
}

function kpisHeading(activeCount: number | null) {
	if (activeCount === null) return "Indicadores";
	return activeCount === 1
		? "1 indicador ativo"
		: `${activeCount} indicadores ativos`;
}

type KpisContentProps = {
	query: ReturnType<typeof useKpis>;
	kpis: Kpi[];
	view: KpiView;
	onEdit: (kpi: Kpi) => void;
	onClearFilters: () => void;
};

function KpisContent({
	query,
	kpis,
	view,
	onEdit,
	onClearFilters,
}: KpisContentProps) {
	if (query.isPending) {
		return <KpisSkeleton />;
	}

	if (query.isError) {
		return <KpisError onRetry={() => void query.refetch()} />;
	}

	return (
		<KpiResults
			kpis={kpis}
			view={view}
			onEdit={onEdit}
			onClearFilters={onClearFilters}
		/>
	);
}

export function AdminKpisPage() {
	const kpisQuery = useKpis();
	const allKpis = kpisQuery.data ?? NO_KPIS;

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
	const activeCount = useMemo(
		() => (kpisQuery.data ? countActive(kpisQuery.data) : null),
		[kpisQuery.data],
	);

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
						{kpisHeading(activeCount)}
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

			<KpisContent
				query={kpisQuery}
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
