import { describe, expect, it } from "vitest";

import {
	achievementsOf,
	historyOf,
	levelProgress,
	pointsByCategory,
	rankOf,
	TEAM_SIZE,
} from "@/lib/member-stats";
import { MOCK_MEMBERS } from "@/mocks/members";

describe("levelProgress", () => {
	it.each([
		[1840, 7],
		[1620, 6],
		[1485, 6],
		[1320, 5],
		[1260, 5],
	])("%i pontos viram nivel %i", (points, level) => {
		expect(levelProgress(points).level).toBe(level);
	});

	it("quebra os pontos em progresso dentro do nivel", () => {
		expect(levelProgress(1840)).toStrictEqual({
			level: 7,
			current: 90,
			needed: 450,
			remaining: 360,
			percent: 20,
		});
	});

	it("comeca no nivel 0 antes dos 100 primeiros pontos", () => {
		expect(levelProgress(0).level).toBe(0);
		expect(levelProgress(99).level).toBe(0);
		expect(levelProgress(100).level).toBe(1);
	});
});

describe("rankOf", () => {
	it("segue a ordem de pontos do time", () => {
		expect(rankOf("u1")).toBe(1);
		expect(rankOf("u12")).toBe(TEAM_SIZE);
		expect(TEAM_SIZE).toBe(MOCK_MEMBERS.length);
	});

	it("nao inventa posicao para id desconhecido", () => {
		expect(rankOf("nao-existe")).toBe(TEAM_SIZE);
	});
});

describe("historyOf", () => {
	it("devolve so as atribuicoes do membro, com KPI e categoria resolvidos", () => {
		const history = historyOf("u3");

		expect(history).toHaveLength(3);
		expect(history.every((entry) => entry.activity.memberId === "u3")).toBe(
			true,
		);
		expect(history[0]?.kpi.name).toBe("Boa ideia em reunião");
		expect(history[0]?.category.label).toBe("Iniciativa");
	});

	it("devolve lista vazia para quem nunca pontuou", () => {
		expect(historyOf("u9")).toHaveLength(0);
	});
});

describe("pointsByCategory", () => {
	it("distribui os pontos entre as quatro categorias", () => {
		const shares = pointsByCategory("u3");
		const byId = new Map(shares.map((share) => [share.category.id, share]));

		expect(shares).toHaveLength(4);
		expect(byId.get("iniciativa")?.points).toBe(23);
		expect(byId.get("presenca")?.points).toBe(5);
		expect(byId.get("desempenho")?.points).toBe(0);
		expect(shares.reduce((sum, share) => sum + share.percent, 0)).toBeCloseTo(
			100,
		);
	});

	it("zera as porcentagens em vez de dividir por zero", () => {
		const shares = pointsByCategory("u9");

		expect(shares).toHaveLength(4);
		expect(shares.every((share) => share.percent === 0)).toBe(true);
	});
});

describe("achievementsOf", () => {
	it("separa conquistadas de bloqueadas sem perder nenhuma", () => {
		const { earned, locked, total } = achievementsOf("u1");

		expect(earned).toHaveLength(8);
		expect(locked).toHaveLength(2);
		expect(earned.length + locked.length).toBe(total);
	});

	it("nao devolve conquista de outro membro", () => {
		const { earned } = achievementsOf("u12");

		expect(earned.map((achievement) => achievement.id)).toStrictEqual(["b1"]);
	});
});
