import type { RankableRow } from "../../shared/ranking";

// Linha crua da agregação do repository: usuário ativo com as atribuições
// válidas da janela já filtradas pelo Prisma.
export type AggregatedMember = {
	id: string;
	name: string;
	position: string | null;
	role: "ADMIN" | "MEMBER";
	assignedKpis: { points: number }[];
};

// Soma e contagem acontecem aqui, fora do Prisma: pontuação negativa subtrai
// e ainda assim conta em kpiCount — é contagem de eventos, não de elogios.
export function toRankableRow(member: AggregatedMember): RankableRow {
	return {
		userId: member.id,
		name: member.name,
		points: member.assignedKpis.reduce((sum, item) => sum + item.points, 0),
		kpiCount: member.assignedKpis.length,
	};
}
