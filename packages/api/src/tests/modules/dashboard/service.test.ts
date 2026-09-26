import { beforeEach, describe, expect, it, vi } from "vitest";

import { dashboardService } from "../../../modules/dashboard/dashboard.service";
import {
	AccountDeactivatedError,
	MemberNotFoundError,
} from "../../../shared/errors/common.errors";
import { levelFor } from "../../../shared/gamification";

const { repositoryMock } = vi.hoisted(() => ({
	repositoryMock: {
		findUserById: vi.fn(),
		aggregateTeam: vi.fn(),
		listRecentValidAssignments: vi.fn(),
		sumPointsInWindow: vi.fn(),
		countMembers: vi.fn(),
		assignmentTotals: vi.fn(),
		countMeetingsInWindow: vi.fn(),
		countOpenMeetings: vi.fn(),
		listRecentAssignments: vi.fn(),
		listActiveMembersWithLastValidAssignment: vi.fn(),
	},
}));

vi.mock("../../../modules/dashboard/dashboard.repository", () => ({
	dashboardRepository: repositoryMock,
}));

const ADMIN_ID = "b29f5637-0ab1-4de0-b2d2-d364e3903124";
const ANA_ID = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";
const BRUNO_ID = "60e3c1d8-f17f-4527-9da6-23ef16299e67";

const NOW = new Date("2026-09-16T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY_MS);

function teamMember(
	id: string,
	name: string,
	points: number[],
	overrides: Record<string, unknown> = {},
) {
	return {
		id,
		name,
		position: null,
		role: "MEMBER" as const,
		assignedKpis: points.map((value) => ({ points: value })),
		...overrides,
	};
}

function recentKpiRow(index: number) {
	return {
		id: `00000000-0000-4000-8000-00000000000${index}`,
		kpiId: "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8",
		points: 10,
		note: null,
		assignedAt: daysAgo(index),
		kpi: { name: "Resolveu bug crítico", category: "PERFORMANCE" as const },
	};
}

function recentAssignmentRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "9e2f7a1c-4b8d-4c1e-9a3f-2d5b6c7e8f90",
		kpiId: "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8",
		userId: ANA_ID,
		assignedBy: ADMIN_ID,
		meetingId: null,
		note: null,
		points: 10,
		revokedAt: null,
		assignedAt: daysAgo(1),
		kpi: {
			id: "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8",
			name: "Resolveu bug crítico",
			category: "PERFORMANCE" as const,
		},
		user: { id: ANA_ID, name: "Ana Souza", position: "Dev" },
		assigner: { id: ADMIN_ID, name: "Administrador" },
		meeting: null,
		...overrides,
	};
}

const TOTALS_BY_START: Record<string, { count: number; points: number }> = {
	"2026-09-14T03:00:00.000Z": { count: 2, points: 30 },
	"2026-09-01T03:00:00.000Z": { count: 7, points: 120 },
	"2026-09-07T03:00:00.000Z": { count: 1, points: 20 },
	"2026-08-01T03:00:00.000Z": { count: 5, points: 80 },
};

function activeMember(
	id: string,
	name: string,
	createdAt: Date,
	lastAssignmentAt: Date | null,
) {
	return {
		id,
		name,
		position: null,
		createdAt,
		assignedKpis: lastAssignmentAt ? [{ assignedAt: lastAssignmentAt }] : [],
	};
}

describe("dashboard service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getMemberDashboard", () => {
		beforeEach(() => {
			repositoryMock.findUserById.mockResolvedValue({
				id: ANA_ID,
				name: "Ana Souza",
				position: "Dev",
				role: "MEMBER",
				active: true,
			});
			repositoryMock.aggregateTeam.mockResolvedValue([
				teamMember(ANA_ID, "Ana Souza", [500, 250, 100]),
				teamMember(BRUNO_ID, "Bruno Lima", [900]),
				teamMember(ADMIN_ID, "Administrador", [], { role: "ADMIN" }),
			]);
			repositoryMock.listRecentValidAssignments.mockResolvedValue([]);
			repositoryMock.sumPointsInWindow.mockResolvedValue(0);
		});

		it("weekPoints soma só a semana ISO corrente do membro, no fuso de São Paulo", async () => {
			repositoryMock.sumPointsInWindow.mockResolvedValueOnce(45);

			const result = await dashboardService.getMemberDashboard(ANA_ID, NOW);

			expect(result.weekPoints).toBe(45);
			expect(repositoryMock.sumPointsInWindow).toHaveBeenCalledWith(
				ANA_ID,
				expect.objectContaining({
					startDay: "2026-09-14",
					endDay: "2026-09-20",
					start: new Date("2026-09-14T03:00:00.000Z"),
				}),
			);
		});

		it("membro sem pontos na semana tem weekPoints 0", async () => {
			const result = await dashboardService.getMemberDashboard(ANA_ID, NOW);

			expect(result.weekPoints).toBe(0);
		});

		it("traz pontos, contagem, posição geral e tamanho da equipe", async () => {
			const result = await dashboardService.getMemberDashboard(ANA_ID);

			expect(result).toMatchObject({
				user: {
					id: ANA_ID,
					name: "Ana Souza",
					position: "Dev",
					role: "MEMBER",
				},
				points: 850,
				kpiCount: 3,
				rankingPosition: 2,
				teamSize: 3,
			});
		});

		it("posição é do período all: agrega a equipe sem janela", async () => {
			await dashboardService.getMemberDashboard(ANA_ID);

			expect(repositoryMock.aggregateTeam).toHaveBeenCalledWith(null);
		});

		it("level é o objeto inteiro de shared/gamification, igual ao de /me/score", async () => {
			const result = await dashboardService.getMemberDashboard(ANA_ID);

			expect(result.level).toEqual(levelFor(850));
			expect(result.level).toMatchObject({
				level: 6,
				tier: "COMPROMETIDO",
				levelFloor: 700,
				nextLevelPoints: 900,
				progress: 75,
			});
		});

		it("recentKpis pede as cinco últimas válidas e mantém a ordem decrescente", async () => {
			repositoryMock.listRecentValidAssignments.mockResolvedValueOnce(
				[1, 2, 3, 4, 5].map(recentKpiRow),
			);

			const result = await dashboardService.getMemberDashboard(ANA_ID);

			expect(repositoryMock.listRecentValidAssignments).toHaveBeenCalledWith(
				ANA_ID,
				5,
			);
			expect(result.recentKpis).toHaveLength(5);
			expect(result.recentKpis[0]).toEqual({
				id: "00000000-0000-4000-8000-000000000001",
				kpiId: "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8",
				name: "Resolveu bug crítico",
				category: "PERFORMANCE",
				points: 10,
				note: null,
				assignedAt: daysAgo(1),
			});
		});

		it("membro sem atribuição: 0 pontos, nível 0, recentKpis vazio, última posição", async () => {
			repositoryMock.aggregateTeam.mockResolvedValueOnce([
				teamMember(ANA_ID, "Ana Souza", []),
				teamMember(BRUNO_ID, "Bruno Lima", [10]),
			]);

			const result = await dashboardService.getMemberDashboard(ANA_ID);

			expect(result).toMatchObject({
				points: 0,
				kpiCount: 0,
				rankingPosition: 2,
				teamSize: 2,
				recentKpis: [],
			});
			expect(result.level.level).toBe(0);
		});

		it("ADMIN autenticado recebe o próprio dashboard de membro", async () => {
			repositoryMock.findUserById.mockResolvedValueOnce({
				id: ADMIN_ID,
				name: "Administrador",
				position: null,
				role: "ADMIN",
				active: true,
			});

			const result = await dashboardService.getMemberDashboard(ADMIN_ID);

			expect(result).toMatchObject({
				user: { id: ADMIN_ID, role: "ADMIN" },
				rankingPosition: 3,
			});
		});

		it("membro desativado recebe ACCOUNT_DEACTIVATED antes de qualquer agregação", async () => {
			repositoryMock.findUserById.mockResolvedValueOnce({
				id: ANA_ID,
				name: "Ana Souza",
				position: null,
				role: "MEMBER",
				active: false,
			});

			await expect(
				dashboardService.getMemberDashboard(ANA_ID),
			).rejects.toBeInstanceOf(AccountDeactivatedError);
			expect(repositoryMock.aggregateTeam).not.toHaveBeenCalled();
		});

		it("ACCOUNT_DEACTIVATED responde 403", () => {
			expect(new AccountDeactivatedError().status).toBe("FORBIDDEN");
		});

		it("usuário inexistente recebe MEMBER_NOT_FOUND", async () => {
			repositoryMock.findUserById.mockResolvedValueOnce(null);

			await expect(
				dashboardService.getMemberDashboard(ANA_ID),
			).rejects.toBeInstanceOf(MemberNotFoundError);
		});
	});

	describe("getAdminDashboard", () => {
		beforeEach(() => {
			repositoryMock.countMembers.mockResolvedValue({ active: 3, total: 4 });
			repositoryMock.assignmentTotals.mockImplementation(
				async (window: { start: Date } | null) => {
					if (window === null) {
						return { count: 40, points: 900 };
					}

					return (
						TOTALS_BY_START[window.start.toISOString()] ?? {
							count: 0,
							points: 0,
						}
					);
				},
			);
			repositoryMock.countMeetingsInWindow.mockImplementation(
				async (window: { startDay: string }) =>
					window.startDay === "2026-09-14" ? 1 : 4,
			);
			repositoryMock.countOpenMeetings.mockResolvedValue(1);
			repositoryMock.aggregateTeam.mockResolvedValue([]);
			repositoryMock.listRecentAssignments.mockResolvedValue([]);
			repositoryMock.listActiveMembersWithLastValidAssignment.mockResolvedValue(
				[],
			);
		});

		it("members conta ativos e total", async () => {
			const result = await dashboardService.getAdminDashboard(NOW);

			expect(result.members).toEqual({ active: 3, total: 4 });
		});

		it("kpis e points usam a semana ISO e o mês de calendário correntes, não os últimos N dias", async () => {
			const result = await dashboardService.getAdminDashboard(NOW);

			const windows = repositoryMock.assignmentTotals.mock.calls
				.slice(0, 2)
				.map(([window]) => window as { startDay: string; endDay: string });
			expect(windows).toEqual([
				expect.objectContaining({
					startDay: "2026-09-14",
					endDay: "2026-09-20",
					start: new Date("2026-09-14T03:00:00.000Z"),
				}),
				expect.objectContaining({
					startDay: "2026-09-01",
					endDay: "2026-09-30",
				}),
			]);
			expect(result.kpis).toMatchObject({ week: 2, month: 7 });
			expect(result.points).toMatchObject({ week: 30, month: 120 });
		});

		it("points.total soma todo o histórico, sem janela", async () => {
			const result = await dashboardService.getAdminDashboard(NOW);

			expect(repositoryMock.assignmentTotals).toHaveBeenCalledWith(null);
			expect(result.points.total).toBe(900);
		});

		it("compara com o mesmo trecho do período anterior, não com o período inteiro", async () => {
			await dashboardService.getAdminDashboard(NOW);

			expect(repositoryMock.assignmentTotals).toHaveBeenCalledWith({
				start: new Date("2026-09-07T03:00:00.000Z"),
				end: new Date("2026-09-09T12:00:00.000Z"),
			});
			expect(repositoryMock.assignmentTotals).toHaveBeenCalledWith({
				start: new Date("2026-08-01T03:00:00.000Z"),
				end: new Date("2026-08-16T12:00:00.000Z"),
			});
		});

		it("weekDelta e monthDelta são a variação em % contra o período anterior", async () => {
			const result = await dashboardService.getAdminDashboard(NOW);

			expect(result.kpis.weekDelta).toBe(100);
			expect(result.points.monthDelta).toBe(50);
		});

		it("queda vira delta negativo", async () => {
			repositoryMock.assignmentTotals.mockImplementation(
				async (window: { start: Date } | null) => {
					if (window === null) {
						return { count: 40, points: 900 };
					}

					const previous = ["2026-09-07", "2026-08-01"].includes(
						window.start.toISOString().slice(0, 10),
					);

					return previous
						? { count: 4, points: 200 }
						: { count: 3, points: 150 };
				},
			);

			const result = await dashboardService.getAdminDashboard(NOW);

			expect(result.kpis.weekDelta).toBe(-25);
			expect(result.points.monthDelta).toBe(-25);
		});

		it("sem nada no período anterior o delta é null, não infinito", async () => {
			repositoryMock.assignmentTotals.mockImplementation(
				async (window: { start: Date } | null) =>
					window === null || window.start.toISOString().startsWith("2026-09-1")
						? { count: 3, points: 90 }
						: { count: 0, points: 0 },
			);

			const result = await dashboardService.getAdminDashboard(NOW);

			expect(result.kpis.weekDelta).toBeNull();
			expect(result.points.monthDelta).toBeNull();
		});

		it("withoutKpisDays expõe o limite que define esquecido", async () => {
			const result = await dashboardService.getAdminDashboard(NOW);

			expect(result.withoutKpisDays).toBe(30);
		});

		it("na segunda de manhã a semana recomeça — atribuição de domingo fica fora", async () => {
			await dashboardService.getAdminDashboard(
				new Date("2026-09-21T11:00:00.000Z"),
			);

			const [week] = repositoryMock.assignmentTotals.mock.calls[0] as [
				{ start: Date },
			];
			const sundayNight = new Date("2026-09-21T02:30:00.000Z");
			expect(sundayNight.getTime()).toBeLessThan(week.start.getTime());
		});

		it("meetings conta semana, mês e as abertas", async () => {
			const result = await dashboardService.getAdminDashboard(NOW);

			expect(result.meetings).toEqual({ week: 1, month: 4, open: 1 });
		});

		it("ranking é do mês corrente, top 5, sem change e sem isMe", async () => {
			repositoryMock.aggregateTeam.mockResolvedValueOnce(
				["Ana", "Bia", "Caio", "Davi", "Eva", "Fábio", "Gil"].map(
					(name, index) =>
						teamMember(`00000000-0000-4000-8000-00000000000${index}`, name, [
							100 - index * 10,
						]),
				),
			);

			const result = await dashboardService.getAdminDashboard(NOW);

			expect(repositoryMock.aggregateTeam).toHaveBeenCalledWith(
				expect.objectContaining({ startDay: "2026-09-01" }),
			);
			expect(result.ranking).toHaveLength(5);
			expect(result.ranking.map((entry) => entry.member.name)).toEqual([
				"Ana",
				"Bia",
				"Caio",
				"Davi",
				"Eva",
			]);
			expect(result.ranking[0]).toEqual({
				position: 1,
				member: {
					id: "00000000-0000-4000-8000-000000000000",
					name: "Ana",
					position: null,
					role: "MEMBER",
				},
				points: 100,
				kpiCount: 1,
			});
		});

		it("recentAssignments pede 10, com user embutido e revogadas incluídas", async () => {
			repositoryMock.listRecentAssignments.mockResolvedValueOnce([
				recentAssignmentRow({ revokedAt: daysAgo(0) }),
				recentAssignmentRow({ id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d" }),
			]);

			const result = await dashboardService.getAdminDashboard(NOW);

			expect(repositoryMock.listRecentAssignments).toHaveBeenCalledWith(10);
			expect(result.recentAssignments).toHaveLength(2);
			expect(result.recentAssignments[0]).toMatchObject({
				revokedAt: daysAgo(0),
				user: { id: ANA_ID, name: "Ana Souza", position: "Dev" },
				kpi: { name: "Resolveu bug crítico" },
			});
		});

		it("recentAssignments diz quem atribuiu e em qual reunião", async () => {
			repositoryMock.listRecentAssignments.mockResolvedValueOnce([
				recentAssignmentRow({
					meetingId: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
					meeting: {
						id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
						title: "Daily de terça",
					},
				}),
				recentAssignmentRow({ id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e" }),
			]);

			const result = await dashboardService.getAdminDashboard(NOW);

			expect(result.recentAssignments[0]).toMatchObject({
				assigner: { id: ADMIN_ID, name: "Administrador" },
				meeting: {
					id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
					title: "Daily de terça",
				},
			});
			expect(result.recentAssignments[1]).toMatchObject({
				assigner: { id: ADMIN_ID, name: "Administrador" },
				meeting: null,
			});
		});

		describe("membersWithoutKpis", () => {
			it("atribuição válida há 29 dias não entra; há 31 dias, entra", async () => {
				repositoryMock.listActiveMembersWithLastValidAssignment.mockResolvedValueOnce(
					[
						activeMember(ANA_ID, "Ana Souza", daysAgo(200), daysAgo(29)),
						activeMember(BRUNO_ID, "Bruno Lima", daysAgo(200), daysAgo(31)),
					],
				);

				const result = await dashboardService.getAdminDashboard(NOW);

				expect(result.membersWithoutKpis).toEqual([
					{
						id: BRUNO_ID,
						name: "Bruno Lima",
						position: null,
						lastAssignmentAt: daysAgo(31),
						daysWithout: 31,
					},
				]);
			});

			it("quem nunca recebeu nada entra com lastAssignmentAt null e dias desde createdAt", async () => {
				repositoryMock.listActiveMembersWithLastValidAssignment.mockResolvedValueOnce(
					[activeMember(ANA_ID, "Ana Souza", daysAgo(60), null)],
				);

				const result = await dashboardService.getAdminDashboard(NOW);

				expect(result.membersWithoutKpis).toEqual([
					expect.objectContaining({
						id: ANA_ID,
						lastAssignmentAt: null,
						daysWithout: 60,
					}),
				]);
			});

			it("membro criado ontem e sem KPI não entra", async () => {
				repositoryMock.listActiveMembersWithLastValidAssignment.mockResolvedValueOnce(
					[activeMember(ANA_ID, "Ana Souza", daysAgo(1), null)],
				);

				const result = await dashboardService.getAdminDashboard(NOW);

				expect(result.membersWithoutKpis).toEqual([]);
			});

			it("ordena do caso mais grave para o menos grave", async () => {
				repositoryMock.listActiveMembersWithLastValidAssignment.mockResolvedValueOnce(
					[
						activeMember(ANA_ID, "Ana Souza", daysAgo(200), daysAgo(40)),
						activeMember(BRUNO_ID, "Bruno Lima", daysAgo(90), null),
					],
				);

				const result = await dashboardService.getAdminDashboard(NOW);

				expect(result.membersWithoutKpis.map((member) => member.id)).toEqual([
					BRUNO_ID,
					ANA_ID,
				]);
			});
		});

		it("equipe vazia: todos os blocos respondem, com zeros e listas vazias", async () => {
			repositoryMock.countMembers.mockResolvedValueOnce({
				active: 0,
				total: 0,
			});
			repositoryMock.assignmentTotals.mockResolvedValue({
				count: 0,
				points: 0,
			});
			repositoryMock.countMeetingsInWindow.mockResolvedValue(0);
			repositoryMock.countOpenMeetings.mockResolvedValueOnce(0);

			await expect(dashboardService.getAdminDashboard(NOW)).resolves.toEqual({
				members: { active: 0, total: 0 },
				kpis: { week: 0, month: 0, weekDelta: null },
				meetings: { week: 0, month: 0, open: 0 },
				points: { week: 0, month: 0, total: 0, monthDelta: null },
				withoutKpisDays: 30,
				ranking: [],
				recentAssignments: [],
				membersWithoutKpis: [],
			});
		});
	});
});
