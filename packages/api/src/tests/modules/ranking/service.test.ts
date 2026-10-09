import { beforeEach, describe, expect, it, vi } from "vitest";

import { PeriodNotAllowedError } from "../../../modules/ranking/ranking.errors";
import { rankingService } from "../../../modules/ranking/ranking.service";

const { repositoryMock } = vi.hoisted(() => ({
	repositoryMock: {
		aggregateWindow: vi.fn(),
		aggregateAll: vi.fn(),
		countAssignmentsInWindow: vi.fn(),
		findSnapshot: vi.fn(),
		findSnapshotStarts: vi.fn(),
		createSnapshots: vi.fn(),
	},
}));

vi.mock("../../../modules/ranking/ranking.repository", () => ({
	rankingRepository: repositoryMock,
}));

const ADMIN_ID = "b29f5637-0ab1-4de0-b2d2-d364e3903124";
const MEMBER_ID = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";
const BRUNO_ID = "60e3c1d8-f17f-4527-9da6-23ef16299e67";

const asAdmin = { userId: ADMIN_ID, role: "ADMIN" as const };
const asMember = { userId: MEMBER_ID, role: "MEMBER" as const };

// Quarta-feira de 2026-09-16: semana corrente 09-14 → 09-20, anterior 09-07 → 09-13.
const NOW = new Date("2026-09-16T12:00:00.000Z");

function member(
	id: string,
	name: string,
	assignedKpis: { points: number }[],
	overrides: Record<string, unknown> = {},
) {
	return {
		id,
		name,
		position: null,
		role: "MEMBER" as const,
		assignedKpis,
		...overrides,
	};
}

const ana = () => member(MEMBER_ID, "Ana Souza", [{ points: 10 }]);
const bruno = () => member(BRUNO_ID, "Bruno Lima", []);
const admin = () =>
	member(ADMIN_ID, "Administrador", [{ points: 5 }], { role: "ADMIN" });

describe("ranking service", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Por padrão a janela anterior já tem snapshot: nada a materializar.
		repositoryMock.findSnapshotStarts.mockResolvedValue([
			{ periodStart: new Date("2026-09-07T00:00:00.000Z") },
		]);
		repositoryMock.findSnapshot.mockResolvedValue([]);
		repositoryMock.aggregateWindow.mockResolvedValue([ana(), bruno(), admin()]);
		repositoryMock.aggregateAll.mockResolvedValue([ana(), bruno(), admin()]);
	});

	describe("participação e pontuação", () => {
		it("todo usuário ativo entra, ADMIN incluído, mesmo sem atribuição", async () => {
			const result = await rankingService.getRanking("week", asMember, NOW);

			const byId = new Map(result.items.map((item) => [item.member.id, item]));
			expect(byId.has(ADMIN_ID)).toBe(true);
			expect(byId.has(BRUNO_ID)).toBe(true);
		});

		it("membro sem atribuição na janela aparece com points 0 e kpiCount 0", async () => {
			const result = await rankingService.getRanking("week", asMember, NOW);

			const entry = result.items.find((item) => item.member.id === BRUNO_ID);
			expect(entry).toMatchObject({ points: 0, kpiCount: 0 });
		});

		it("pontuação negativa subtrai e ainda assim conta em kpiCount", async () => {
			repositoryMock.aggregateWindow.mockResolvedValueOnce([
				member(MEMBER_ID, "Ana Souza", [
					{ points: 10 },
					{ points: 12 },
					{ points: -2 },
				]),
				bruno(),
			]);

			const result = await rankingService.getRanking("week", asMember, NOW);

			const entry = result.items.find((item) => item.member.id === MEMBER_ID);
			expect(entry).toMatchObject({ points: 20, kpiCount: 3 });
		});

		it("recorta a janela com início inclusivo e fim exclusivo", async () => {
			await rankingService.getRanking("week", asMember, NOW);

			expect(repositoryMock.aggregateWindow).toHaveBeenCalledWith(
				expect.objectContaining({
					start: new Date("2026-09-14T03:00:00.000Z"),
					end: new Date("2026-09-21T03:00:00.000Z"),
				}),
			);
		});

		it("ordena pelo ranking e numera posições sequenciais", async () => {
			const result = await rankingService.getRanking("week", asMember, NOW);

			expect(result.items.map((item) => item.position)).toEqual([1, 2, 3]);
			expect(result.items[0]?.member.id).toBe(MEMBER_ID);
			expect(result.items[0]?.points).toBe(10);
		});
	});

	describe("contrato", () => {
		it("entry.position é colocação e entry.member.position é cargo", async () => {
			repositoryMock.aggregateWindow.mockResolvedValueOnce([
				member(MEMBER_ID, "Ana Souza", [{ points: 10 }], {
					position: "Dev",
				}),
				bruno(),
			]);

			const result = await rankingService.getRanking("week", asMember, NOW);

			expect(result.items[0]).toMatchObject({
				position: 1,
				member: { id: MEMBER_ID, position: "Dev" },
			});
		});

		it("isMe marca exatamente a entrada do usuário autenticado e me bate com ela", async () => {
			const result = await rankingService.getRanking("week", asMember, NOW);

			const marked = result.items.filter((item) => item.isMe);
			expect(marked).toHaveLength(1);
			expect(marked[0]?.member.id).toBe(MEMBER_ID);

			const entry = result.items.find((item) => item.member.id === MEMBER_ID);
			expect(result.me).toEqual({
				position: entry?.position,
				points: entry?.points,
				kpiCount: entry?.kpiCount,
				change: entry?.change,
			});
		});

		it("me vem null quando o autenticado não está no ranking", async () => {
			const outsider = {
				userId: "0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
				role: "MEMBER" as const,
			};

			const result = await rankingService.getRanking("week", outsider, NOW);

			expect(result.items.every((item) => !item.isMe)).toBe(true);
			expect(result.me).toBeNull();
		});
	});

	describe("snapshot e change", () => {
		it("change = posição no snapshot anterior − posição atual", async () => {
			// Ana era 3ª na semana passada e é 1ª agora: subiu 2.
			repositoryMock.findSnapshot.mockResolvedValueOnce([
				{ userId: MEMBER_ID, position: 3 },
			]);

			const result = await rankingService.getRanking("week", asMember, NOW);

			const entry = result.items.find((item) => item.member.id === MEMBER_ID);
			expect(entry?.change).toBe(2);
		});

		it("change 0 quando a posição não mudou", async () => {
			repositoryMock.findSnapshot.mockResolvedValueOnce([
				{ userId: MEMBER_ID, position: 1 },
			]);

			const result = await rankingService.getRanking("week", asMember, NOW);

			expect(
				result.items.find((item) => item.member.id === MEMBER_ID)?.change,
			).toBe(0);
		});

		it("change negativo quando a posição piorou", async () => {
			repositoryMock.findSnapshot.mockResolvedValueOnce([
				{ userId: MEMBER_ID, position: 1 },
			]);
			repositoryMock.aggregateWindow.mockResolvedValueOnce([
				member(ADMIN_ID, "Administrador", [{ points: 20 }], {
					role: "ADMIN",
				}),
				ana(),
				bruno(),
			]);

			const result = await rankingService.getRanking("week", asMember, NOW);

			expect(
				result.items.find((item) => item.member.id === MEMBER_ID)?.change,
			).toBe(-1);
		});

		it("usuário ausente do snapshot anterior recebe change null, não 0", async () => {
			repositoryMock.findSnapshot.mockResolvedValueOnce([
				{ userId: BRUNO_ID, position: 1 },
			]);

			const result = await rankingService.getRanking("week", asMember, NOW);

			expect(
				result.items.find((item) => item.member.id === MEMBER_ID)?.change,
			).toBeNull();
		});

		it("janela anterior sem snapshot deixa change null para todos", async () => {
			repositoryMock.findSnapshot.mockResolvedValueOnce([]);

			const result = await rankingService.getRanking("week", asMember, NOW);

			expect(result.items.every((item) => item.change === null)).toBe(true);
		});

		it("period=all nunca grava snapshot e sempre devolve change null", async () => {
			const result = await rankingService.getRanking("all", asMember, NOW);

			expect(result.periodStart).toBeNull();
			expect(result.periodEnd).toBeNull();
			expect(result.items.every((item) => item.change === null)).toBe(true);
			expect(repositoryMock.findSnapshotStarts).not.toHaveBeenCalled();
			expect(repositoryMock.createSnapshots).not.toHaveBeenCalled();
			expect(repositoryMock.countAssignmentsInWindow).not.toHaveBeenCalled();
		});
	});

	describe("materialização", () => {
		it("congela a janela anterior e não a corrente", async () => {
			repositoryMock.findSnapshotStarts.mockResolvedValueOnce([]);
			repositoryMock.countAssignmentsInWindow.mockResolvedValue(3);

			await rankingService.getRanking("week", asMember, NOW);

			// Sem nenhum snapshot existente a caminhada vai até o teto — mas
			// nenhuma das janelas materializadas é a corrente.
			expect(repositoryMock.createSnapshots).toHaveBeenCalledTimes(12);
			const materializedDays = repositoryMock.createSnapshots.mock.calls.map(
				(call) => call[1],
			);
			expect(materializedDays).toContain("2026-09-07");
			expect(materializedDays).not.toContain("2026-09-14");
		});

		it("segunda leitura não regrava — janela anterior já tem snapshot", async () => {
			await rankingService.getRanking("week", asMember, NOW);

			expect(repositoryMock.countAssignmentsInWindow).not.toHaveBeenCalled();
			expect(repositoryMock.createSnapshots).not.toHaveBeenCalled();
		});

		it("janela anterior sem atribuição não vira snapshot, e a caminhada continua", async () => {
			repositoryMock.findSnapshotStarts.mockResolvedValueOnce([]);
			repositoryMock.countAssignmentsInWindow
				.mockResolvedValueOnce(0) // 2026-09-07: nada, não congela
				.mockResolvedValue(2); // janelas mais antigas têm atribuição

			await rankingService.getRanking("week", asMember, NOW);

			const materializedDays = repositoryMock.createSnapshots.mock.calls.map(
				(call) => call[1],
			);
			expect(materializedDays).not.toContain("2026-09-07");
			expect(materializedDays).toContain("2026-08-31");
		});

		it("a caminhada para ao encontrar um snapshot existente", async () => {
			repositoryMock.findSnapshotStarts.mockResolvedValueOnce([
				{ periodStart: new Date("2026-08-31T00:00:00.000Z") },
			]);
			repositoryMock.countAssignmentsInWindow.mockResolvedValue(2);

			await rankingService.getRanking("week", asMember, NOW);

			expect(repositoryMock.createSnapshots).toHaveBeenCalledTimes(1);
			expect(repositoryMock.createSnapshots).toHaveBeenCalledWith(
				"week",
				"2026-09-07",
				expect.any(Array),
			);
		});

		it("a materialização para no teto de 12 janelas", async () => {
			repositoryMock.findSnapshotStarts.mockResolvedValueOnce([]);
			repositoryMock.countAssignmentsInWindow.mockResolvedValue(1);

			await rankingService.getRanking("week", asMember, NOW);

			expect(repositoryMock.createSnapshots).toHaveBeenCalledTimes(12);
		});
	});

	describe("períodos e autorização", () => {
		it("quarter pedido por MEMBER é PERIOD_NOT_ALLOWED antes de qualquer query", async () => {
			await expect(
				rankingService.getRanking("quarter", asMember, NOW),
			).rejects.toThrow(PeriodNotAllowedError);

			expect(repositoryMock.aggregateWindow).not.toHaveBeenCalled();
			expect(repositoryMock.aggregateAll).not.toHaveBeenCalled();
		});

		it("quarter pedido por ADMIN passa", async () => {
			const result = await rankingService.getRanking("quarter", asAdmin, NOW);

			expect(result.period).toBe("quarter");
			expect(result.periodStart).toBe("2026-07-01");
			expect(result.periodEnd).toBe("2026-09-30");
			expect(repositoryMock.aggregateWindow).toHaveBeenCalledWith(
				expect.objectContaining({ startDay: "2026-07-01" }),
			);
		});

		it("month recorta o mês de calendário e lê o snapshot do mês anterior", async () => {
			await rankingService.getRanking("month", asMember, NOW);

			expect(repositoryMock.aggregateWindow).toHaveBeenCalledWith(
				expect.objectContaining({
					startDay: "2026-09-01",
					endDay: "2026-09-30",
				}),
			);
			expect(repositoryMock.findSnapshot).toHaveBeenCalledWith(
				"month",
				"2026-08-01",
			);
		});

		it("sem paginação: a equipe inteira vem numa resposta só", async () => {
			const result = await rankingService.getRanking("all", asMember, NOW);

			expect(result.items).toHaveLength(3);
			expect(result).not.toHaveProperty("total");
		});
	});
});
