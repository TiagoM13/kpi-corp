import { Badge } from "@kpi-corp/ui/components/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@kpi-corp/ui/components/table";
import { CategoryChip } from "@/components/category-chip";
import { CATEGORY_BY_ID, type Kpi } from "@/mocks/kpis";

export function KpisTable({ kpis }: { kpis: Kpi[] }) {
	return (
		<Table className="text-sm">
			<TableHeader className="[&_th]:h-9 [&_th]:px-3 [&_th]:font-medium [&_th]:text-2xs [&_th]:text-fg-3 [&_th]:uppercase [&_th]:tracking-widest">
				<TableRow className="hover:bg-transparent">
					<TableHead>KPI</TableHead>
					<TableHead>Categoria</TableHead>
					<TableHead className="text-right">Pontos</TableHead>
					<TableHead className="text-right">Usos</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody className="[&_td]:px-3 [&_td]:py-3">
				{kpis.map((kpi) => {
					const category = CATEGORY_BY_ID.get(kpi.category);

					return (
						<TableRow
							key={kpi.id}
							className={kpi.active ? undefined : "opacity-60"}
						>
							<TableCell className="max-w-md whitespace-normal">
								<div className="flex flex-col leading-tight">
									<span className="font-medium">{kpi.name}</span>
									<span className="text-2xs text-fg-3">{kpi.description}</span>
								</div>
							</TableCell>

							<TableCell>
								{category ? <CategoryChip category={category} /> : null}
							</TableCell>

							<TableCell
								className="text-right font-semibold tabular-nums"
								style={category ? { color: category.color } : undefined}
							>
								+{kpi.points}
							</TableCell>

							<TableCell className="text-right text-fg-1 tabular-nums">
								{kpi.uses}
							</TableCell>

							<TableCell>
								{kpi.active ? (
									<Badge
										variant="outline"
										className="border-good/25 bg-good/10 text-good"
									>
										<span
											aria-hidden
											className="size-1.5 rounded-full bg-current"
										/>
										Ativo
									</Badge>
								) : (
									<Badge variant="outline" className="bg-bg-2 text-fg-2">
										<span
											aria-hidden
											className="size-1.5 rounded-full bg-current"
										/>
										Inativo
									</Badge>
								)}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
