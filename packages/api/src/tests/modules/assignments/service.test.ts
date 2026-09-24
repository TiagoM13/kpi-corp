import { beforeEach, describe, expect, it, vi } from "vitest";

import { assignmentsService } from "../../../modules/assignments/assignments.service";

const { repositoryMock } = vi.hoisted(() => ({
	repositoryMock: {
		create: vi.fn(),
		createMany: vi.fn(),
		listByUser: vi.fn(),
		list: vi.fn(),
		findById: vi.fn(),
		revoke: vi.fn(),
		findKpiById: vi.fn(),
		findUserById: vi.fn(),
	},
}));

vi.mock("../../../modules/assignments/assignments.repository", () => ({
	assignmentsRepository: repositoryMock,
}));

const ASSIGNMENT_ID = "9e2f7a1c-4b8d-4c1e-9a3f-2d5b6c7e8f90";
const MEETING_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("assignments service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("revoke", () => {
		it("revoke nao consulta a reuniao: assignment de reuniao encerrada continua revogavel", async () => {
			const closedMeetingAssignment = {
				id: ASSIGNMENT_ID,
				kpiId: "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8",
				userId: "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf",
				assignedBy: "b29f5637-0ab1-4de0-b2d2-d364e3903124",
				meetingId: MEETING_ID,
				note: null,
				points: 5,
				revokedAt: null,
				assignedAt: new Date("2026-08-30T14:05:00.000Z"),
				kpi: {
					id: "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8",
					name: "Presença na reunião",
					category: "PRESENCE" as const,
				},
			};

			repositoryMock.findById.mockResolvedValueOnce(closedMeetingAssignment);
			repositoryMock.revoke.mockResolvedValueOnce({
				...closedMeetingAssignment,
				revokedAt: new Date("2026-08-30T16:00:00.000Z"),
			});

			const result = await assignmentsService.revoke(ASSIGNMENT_ID);

			expect(repositoryMock.revoke).toHaveBeenCalledWith(
				ASSIGNMENT_ID,
				expect.any(Date),
			);
			expect(result).toMatchObject({
				id: ASSIGNMENT_ID,
				meetingId: MEETING_ID,
				revokedAt: expect.any(Date),
			});
		});
	});

	describe("list", () => {
		const USER_ID = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";

		function historyRow(overrides: Record<string, unknown> = {}) {
			return {
				id: ASSIGNMENT_ID,
				kpiId: "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8",
				userId: USER_ID,
				assignedBy: "b29f5637-0ab1-4de0-b2d2-d364e3903124",
				meetingId: null,
				note: "Excelente apresentação",
				points: 25,
				revokedAt: null,
				assignedAt: new Date("2026-08-30T14:12:00.000Z"),
				kpi: {
					id: "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8",
					name: "Resolveu bug crítico",
					category: "PERFORMANCE" as const,
				},
				user: { id: USER_ID, name: "João", position: "Dev" },
				...overrides,
			};
		}

		const base = { page: 1, limit: 20 };

		it("traz o user com nome e cargo, e o KPI embutido", async () => {
			repositoryMock.list.mockResolvedValueOnce({
				items: [historyRow()],
				total: 1,
			});

			const result = await assignmentsService.list(base);

			expect(result.items[0]).toEqual({
				id: ASSIGNMENT_ID,
				kpiId: "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8",
				userId: USER_ID,
				assignedBy: "b29f5637-0ab1-4de0-b2d2-d364e3903124",
				meetingId: null,
				note: "Excelente apresentação",
				points: 25,
				revokedAt: null,
				assignedAt: new Date("2026-08-30T14:12:00.000Z"),
				kpi: {
					id: "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8",
					name: "Resolveu bug crítico",
					category: "PERFORMANCE",
				},
				user: { id: USER_ID, name: "João", position: "Dev" },
			});
		});

		it("traz revogadas e não revogadas por padrão — nenhum filtro de revokedAt", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [], total: 0 });

			await assignmentsService.list(base);

			expect(repositoryMock.list).toHaveBeenCalledWith(
				expect.objectContaining({ revoked: undefined }),
			);
		});

		it("repassa todos os filtros combinados, não só o último", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [], total: 0 });

			await assignmentsService.list({
				...base,
				userId: USER_ID,
				kpiId: "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8",
				category: "PERFORMANCE",
				revoked: true,
			});

			expect(repositoryMock.list).toHaveBeenCalledWith({
				userId: USER_ID,
				kpiId: "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8",
				category: "PERFORMANCE",
				revoked: true,
				from: undefined,
				to: undefined,
				page: 1,
				limit: 20,
			});
		});

		it("from começa às 00:00 de São Paulo, inclusivo", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [], total: 0 });

			await assignmentsService.list({ ...base, from: "2026-08-01" });

			expect(repositoryMock.list).toHaveBeenCalledWith(
				expect.objectContaining({
					from: new Date("2026-08-01T03:00:00.000Z"),
					to: undefined,
				}),
			);
		});

		it("to inclui o dia inteiro: o fim exclusivo é 00:00 do dia seguinte em São Paulo", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [], total: 0 });

			await assignmentsService.list({ ...base, to: "2026-08-31" });

			const call = repositoryMock.list.mock.calls[0]?.[0] as { to: Date };
			expect(call.to).toEqual(new Date("2026-09-01T03:00:00.000Z"));

			const lateOnTheLastDay = new Date("2026-09-01T02:00:00.000Z");
			expect(lateOnTheLastDay.getTime()).toBeLessThan(call.to.getTime());
		});

		it("from sem to e to sem from funcionam", async () => {
			repositoryMock.list.mockResolvedValue({ items: [], total: 0 });

			await assignmentsService.list({ ...base, from: "2026-08-01" });
			await assignmentsService.list({ ...base, to: "2026-08-31" });

			expect(repositoryMock.list).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ to: undefined }),
			);
			expect(repositoryMock.list).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ from: undefined }),
			);
		});

		it("calcula total e totalPages", async () => {
			repositoryMock.list.mockResolvedValueOnce({
				items: [historyRow()],
				total: 142,
			});

			const result = await assignmentsService.list(base);

			expect(result).toMatchObject({
				page: 1,
				limit: 20,
				total: 142,
				totalPages: 8,
			});
		});

		it("lista vazia devolve items vazio e total 0, no mesmo shape de GET /members", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [], total: 0 });

			const result = await assignmentsService.list({
				...base,
				userId: "00000000-0000-4000-8000-000000000000",
			});

			expect(result).toEqual({
				items: [],
				page: 1,
				limit: 20,
				total: 0,
				totalPages: 1,
			});
		});

		it("página além do fim devolve lista vazia, não erro", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [], total: 3 });

			await expect(
				assignmentsService.list({ page: 9, limit: 20 }),
			).resolves.toMatchObject({ items: [], page: 9, total: 3 });
		});
	});
});
