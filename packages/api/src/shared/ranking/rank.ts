// Ordenação, desempate e numeração do ranking. Função pura: quem carrega o
// dado é o repository, quem ordena é aqui — sem Prisma, sem módulo.

export type RankableRow = {
	userId: string;
	name: string;
	points: number;
	kpiCount: number;
};

export type RankedRow = RankableRow & { position: number };

// pt-BR e não `<` de string: Ávila precisa cair antes de Bueno, e a comparação
// por code point manda todo acento para o fim do alfabeto.
const collator = new Intl.Collator("pt-BR");

export function rank(rows: RankableRow[]): RankedRow[] {
	const sorted = [...rows].sort(
		(a, b) =>
			b.points - a.points ||
			b.kpiCount - a.kpiCount ||
			collator.compare(a.name, b.name) ||
			// Empate absoluto ordena por userId só para a saída ser determinística
			// entre requisições — as posições seguem sequenciais (1, 2, 3).
			a.userId.localeCompare(b.userId),
	);

	return sorted.map((row, index) => ({ ...row, position: index + 1 }));
}

export type RankableMember = {
	id: string;
	name: string;
	assignedKpis: { points: number }[];
};

// Soma e contagem acontecem aqui, fora do Prisma: pontuação negativa subtrai
// e ainda assim conta em kpiCount — é contagem de eventos, não de elogios.
export function toRankableRow(member: RankableMember): RankableRow {
	return {
		userId: member.id,
		name: member.name,
		points: member.assignedKpis.reduce((sum, item) => sum + item.points, 0),
		kpiCount: member.assignedKpis.length,
	};
}
