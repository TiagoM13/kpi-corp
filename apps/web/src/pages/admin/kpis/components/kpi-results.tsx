import { Button } from "@kpi-corp/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { SearchXIcon } from "lucide-react";
import type { Kpi } from "@/mocks/kpis";
import type { KpiView } from "./kpi-filters-bar";
import { KpiGrid } from "./kpi-grid";
import { KpisTable } from "./kpis-table";

type KpiResultsProps = {
	kpis: Kpi[];
	view: KpiView;
	onEdit: (kpi: Kpi) => void;
	onClearFilters: () => void;
};

export function KpiResults({
	kpis,
	view,
	onEdit,
	onClearFilters,
}: KpiResultsProps) {
	if (kpis.length === 0) {
		return (
			<Empty className="border">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<SearchXIcon />
					</EmptyMedia>
					<EmptyTitle>Nada encontrado</EmptyTitle>
					<EmptyDescription>
						Nenhum KPI bate com os filtros escolhidos.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button type="button" variant="outline" onClick={onClearFilters}>
						Limpar filtros
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	if (view === "list") {
		return (
			<>
				<KpiGrid kpis={kpis} onEdit={onEdit} className="lg:hidden" />
				<div className="hidden rounded-lg border bg-card lg:block">
					<KpisTable kpis={kpis} onEdit={onEdit} />
				</div>
			</>
		);
	}

	return <KpiGrid kpis={kpis} onEdit={onEdit} />;
}
