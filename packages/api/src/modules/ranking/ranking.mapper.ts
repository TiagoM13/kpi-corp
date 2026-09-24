// Linha crua da agregação do repository: usuário ativo com as atribuições
// válidas da janela já filtradas pelo Prisma.
export type AggregatedMember = {
	id: string;
	name: string;
	position: string | null;
	role: "ADMIN" | "MEMBER";
	assignedKpis: { points: number }[];
};
