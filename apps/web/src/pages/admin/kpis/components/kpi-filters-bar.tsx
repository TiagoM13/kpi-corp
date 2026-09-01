import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@kpi-corp/ui/components/input-group";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@kpi-corp/ui/components/toggle-group";
import { LayoutGridIcon, ListIcon, SearchIcon } from "lucide-react";
import {
	SegmentedControl,
	type SegmentedOption,
} from "@/components/segmented-control";
import type { KpiFilters, KpiStatusFilter } from "@/lib/kpi-filters";
import { KPI_CATEGORIES, type KpiCategoryId } from "@/mocks/kpis";

export type KpiView = "grid" | "list";

const STATUS_OPTIONS: SegmentedOption<KpiStatusFilter>[] = [
	{ value: "all", label: "Todos" },
	{ value: "active", label: "Ativos" },
	{ value: "inactive", label: "Inativos" },
];

const VIEW_OPTIONS: SegmentedOption<KpiView>[] = [
	{ value: "grid", label: <LayoutGridIcon />, srLabel: "Ver em grade" },
	{ value: "list", label: <ListIcon />, srLabel: "Ver em lista" },
];

type KpiFiltersBarProps = {
	filters: KpiFilters;
	onChange: (patch: Partial<KpiFilters>) => void;
	view: KpiView;
	onViewChange: (view: KpiView) => void;
};

export function KpiFiltersBar({
	filters,
	onChange,
	view,
	onViewChange,
}: KpiFiltersBarProps) {
	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
			<InputGroup className="lg:w-80">
				<InputGroupAddon>
					<SearchIcon className="text-fg-3" />
				</InputGroupAddon>
				<InputGroupInput
					type="search"
					value={filters.search}
					onChange={(event) => onChange({ search: event.target.value })}
					placeholder="Buscar KPI…"
					aria-label="Buscar KPI por nome ou descrição"
				/>
			</InputGroup>

			<SegmentedControl
				label="Filtrar por status"
				value={filters.status}
				options={STATUS_OPTIONS}
				onValueChange={(status) => onChange({ status })}
			/>

			<ToggleGroup
				multiple
				spacing={2}
				aria-label="Filtrar por categoria"
				className="flex-wrap"
				value={filters.categories}
				onValueChange={(value) =>
					onChange({ categories: value as KpiCategoryId[] })
				}
			>
				{KPI_CATEGORIES.map((category) => {
					const selected = filters.categories.includes(category.id);

					return (
						<ToggleGroupItem
							key={category.id}
							value={category.id}
							variant="outline"
							className="gap-2 rounded-full text-fg-1"
							style={
								selected
									? {
											color: category.color,
											borderColor: category.color,
											backgroundColor: `color-mix(in oklab, ${category.color} 20%, transparent)`,
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
						</ToggleGroupItem>
					);
				})}
			</ToggleGroup>

			<SegmentedControl
				label="Modo de visualização"
				value={view}
				options={VIEW_OPTIONS}
				onValueChange={onViewChange}
				className="hidden lg:ml-auto lg:block"
			/>
		</div>
	);
}
