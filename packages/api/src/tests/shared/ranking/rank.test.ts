import { describe, expect, it } from "vitest";

import { type RankableRow, rank } from "../../../shared/ranking/rank";

function row(overrides: Partial<RankableRow>): RankableRow {
	return {
		userId: "user-1",
		name: "Ana",
		points: 0,
		kpiCount: 0,
		...overrides,
	};
}

describe("rank", () => {
	it("ordena por pontos decrescente", () => {
		const ranked = rank([
			row({ userId: "a", points: 10 }),
			row({ userId: "b", points: 30 }),
			row({ userId: "c", points: 20 }),
		]);

		expect(ranked.map((item) => item.userId)).toEqual(["b", "c", "a"]);
		expect(ranked.map((item) => item.position)).toEqual([1, 2, 3]);
	});

	it("empate de pontos desempata por kpiCount decrescente", () => {
		const ranked = rank([
			row({ userId: "a", points: 10, kpiCount: 2 }),
			row({ userId: "b", points: 10, kpiCount: 5 }),
		]);

		expect(ranked[0]?.userId).toBe("b");
		expect(ranked[1]?.userId).toBe("a");
	});

	it("empate de pontos e contagem desempata por nome em pt-BR, acento na posição certa", () => {
		// Por code point, Á (0xC1) > B e Bueno ganharia — a colação pt-BR
		// ordena Ávila como A.
		const ranked = rank([
			row({ userId: "a", name: "Bueno", points: 10, kpiCount: 1 }),
			row({ userId: "b", name: "Ávila", points: 10, kpiCount: 1 }),
		]);

		expect(ranked[0]?.name).toBe("Ávila");
		expect(ranked[1]?.name).toBe("Bueno");
	});

	it("empate absoluto recebe posições sequenciais, nunca compartilhadas", () => {
		const ranked = rank([
			row({ userId: "c", points: 10, kpiCount: 1 }),
			row({ userId: "a", points: 10, kpiCount: 1 }),
			row({ userId: "b", points: 10, kpiCount: 1 }),
		]);

		expect(ranked.map((item) => item.position)).toEqual([1, 2, 3]);
		// O desempate entre iguais em tudo é o userId, para a saída ser estável.
		expect(ranked.map((item) => item.userId)).toEqual(["a", "b", "c"]);
	});

	it("lista vazia devolve lista vazia", () => {
		expect(rank([])).toEqual([]);
	});

	it("a mesma entrada em ordem embaralhada produz o mesmo resultado", () => {
		const rows = [
			row({ userId: "a", name: "Ana", points: 5, kpiCount: 1 }),
			row({ userId: "b", name: "Bruno", points: 5, kpiCount: 3 }),
			row({ userId: "c", name: "Carla", points: 9, kpiCount: 1 }),
			row({ userId: "d", name: "Ana", points: 5, kpiCount: 1 }),
		];

		expect(rank([...rows].reverse())).toEqual(rank(rows));
	});

	it("não muta a lista de entrada", () => {
		const rows = [
			row({ userId: "a", points: 1 }),
			row({ userId: "b", points: 2 }),
		];
		const snapshot = [...rows];

		rank(rows);

		expect(rows).toEqual(snapshot);
	});
});
