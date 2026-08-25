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
import type { KpiFilters, KpiStatusFilter } from "@/lib/kpi-filters";
import { KPI_CATEGORIES, type KpiCategoryId } from "@/mocks/kpis";

export type KpiView = "grid" | "list";

const STATUS_OPTIONS: { value: KpiStatusFilter; label: string }[] = [
	{ value: "all", label: "Todos" },
	{ value: "active", label: "Ativos" },
	{ value: "inactive", label: "Inativos" },
];

const SEGMENT = "rounded-sm border bg-bg-2 p-0.75";
const SEGMENT_ITEM =
	"text-fg-2 aria-pressed:bg-bg-3 aria-pressed:text-foreground";

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

			<div className={SEGMENT}>
				<ToggleGroup
					spacing={0}
					aria-label="Filtrar por status"
					value={[filters.status]}
					onValueChange={(value) => {
						const [status] = value as KpiStatusFilter[];
						if (status) onChange({ status });
					}}
				>
					{STATUS_OPTIONS.map((option) => (
						<ToggleGroupItem
							key={option.value}
							value={option.value}
							className={SEGMENT_ITEM}
						>
							{option.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>

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

			<div className={`${SEGMENT} hidden lg:ml-auto lg:block`}>
				<ToggleGroup
					spacing={0}
					aria-label="Modo de visualização"
					value={[view]}
					onValueChange={(value) => {
						const [next] = value as KpiView[];
						if (next) onViewChange(next);
					}}
				>
					<ToggleGroupItem
						value="grid"
						aria-label="Ver em grade"
						className={SEGMENT_ITEM}
					>
						<LayoutGridIcon />
					</ToggleGroupItem>
					<ToggleGroupItem
						value="list"
						aria-label="Ver em lista"
						className={SEGMENT_ITEM}
					>
						<ListIcon />
					</ToggleGroupItem>
				</ToggleGroup>
			</div>
		</div>
	);
}
