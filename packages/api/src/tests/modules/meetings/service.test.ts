import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	AttendeeNotPresentError,
	KpiInactiveError,
	KpiNotFoundError,
	KpiNotPresenceError,
	MeetingAlreadyClosedError,
	MeetingClosedError,
	MeetingNotFoundError,
	MemberInactiveError,
	MemberNotFoundError,
} from "../../../modules/meetings/meetings.errors";
import { meetingsService } from "../../../modules/meetings/meetings.service";

const { repositoryMock } = vi.hoisted(() => ({
	repositoryMock: {
		transaction: vi.fn((run: (tx: unknown) => unknown) => run({})),
		create: vi.fn(),
		findById: vi.fn(),
		lockForUpdate: vi.fn(),
		findCreator: vi.fn(),
		findDetailById: vi.fn(),
		findKpiById: vi.fn(),
		findUsersByIds: vi.fn(),
		findAttendee: vi.fn(),
		findAttendees: vi.fn(),
		addAttendees: vi.fn(),
		createPresentAttendees: vi.fn(),
		markAttendeesPresent: vi.fn(),
		createAssignments: vi.fn(),
		createAssignment: vi.fn(),
		close: vi.fn(),
		list: vi.fn(),
	},
}));

vi.mock("../../../modules/meetings/meetings.repository", () => ({
	meetingsRepository: repositoryMock,
}));

const ADMIN_ID = "b29f5637-0ab1-4de0-b2d2-d364e3903124";
const MEMBER_ID = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";
const OTHER_MEMBER_ID = "7c1d9e2f-3a4b-4c5d-8e6f-1a2b3c4d5e6f";
const MEETING_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const KPI_ID = "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8";

const creator = { id: ADMIN_ID, name: "Administrador" };

function meetingRow(overrides: Record<string, unknown> = {}) {
	return {
		id: MEETING_ID,
		title: "Reunião semanal",
		date: new Date("2026-08-30T00:00:00.000Z"),
		closedAt: null,
		createdBy: ADMIN_ID,
		createdAt: new Date("2026-08-30T14:00:00.000Z"),
		...overrides,
	};
}

function detailRow(overrides: Record<string, unknown> = {}) {
	return {
		...meetingRow(),
		attendees: [],
		assignments: [],
		...overrides,
	};
}

function assignmentRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "9e2f7a1c-4b8d-4c1e-9a3f-2d5b6c7e8f90",
		kpiId: KPI_ID,
		userId: MEMBER_ID,
		assignedBy: ADMIN_ID,
		meetingId: MEETING_ID,
		note: null,
		points: 5,
		revokedAt: null,
		assignedAt: new Date("2026-08-30T14:05:00.000Z"),
		kpi: {
			id: KPI_ID,
			name: "Presença na reunião",
			category: "PRESENCE" as const,
		},
		...overrides,
	};
}

const presenceKpi = {
	id: KPI_ID,
	name: "Presença na reunião",
	description: null,
	points: 5,
	category: "PRESENCE" as const,
	active: true,
	createdAt: new Date(),
};

const performanceKpi = {
	...presenceKpi,
	id: "8c1e9d2b-4a5f-4b6a-9c7d-3e2f1a0b9c8d",
	name: "Entregou no prazo",
	points: 12,
	category: "PERFORMANCE" as const,
};

const inactiveKpi = { ...presenceKpi, active: false };

function mockDetail() {
	repositoryMock.findDetailById.mockResolvedValue(detailRow());
	repositoryMock.findCreator.mockResolvedValue(creator);
}

function expectLockedBefore(readMock: {
	mock: { invocationCallOrder: number[] };
}) {
	const [lockOrder] = repositoryMock.lockForUpdate.mock.invocationCallOrder;
	const [readOrder] = readMock.mock.invocationCallOrder;

	expect(repositoryMock.lockForUpdate).toHaveBeenCalledWith(
		MEETING_ID,
		expect.anything(),
	);
	expect(lockOrder).toBeDefined();
	expect(readOrder).toBeDefined();
	expect(lockOrder as number).toBeLessThan(readOrder as number);
}

describe("meetings service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		repositoryMock.transaction.mockImplementation((run) => run({}));
	});

	describe("create", () => {
		it("devolve status OPEN e closedAt null", async () => {
			repositoryMock.create.mockResolvedValueOnce(meetingRow());
			mockDetail();

			const result = await meetingsService.create(
				{ title: "Reunião semanal", date: new Date("2026-08-30") },
				ADMIN_ID,
			);

			expect(result).toMatchObject({
				id: MEETING_ID,
				status: "OPEN",
				closedAt: null,
				attendees: [],
			});
		});

		it("grava createdBy vindo do contexto", async () => {
			repositoryMock.create.mockResolvedValueOnce(meetingRow());
			mockDetail();

			await meetingsService.create(
				{ title: "Reunião semanal", date: new Date("2026-08-30") },
				ADMIN_ID,
			);

			expect(repositoryMock.create).toHaveBeenCalledWith(
				expect.objectContaining({ createdBy: ADMIN_ID }),
			);
		});
	});

	describe("getById", () => {
		it("traz createdBy com nome, nao so id", async () => {
			repositoryMock.findDetailById.mockResolvedValueOnce(detailRow());
			repositoryMock.findCreator.mockResolvedValueOnce(creator);

			const result = await meetingsService.getById(MEETING_ID);

			expect(result.createdBy).toEqual({ id: ADMIN_ID, name: "Administrador" });
		});

		it("traz escalado e presente na mesma lista de attendees", async () => {
			repositoryMock.findDetailById.mockResolvedValueOnce(
				detailRow({
					attendees: [
						{
							userId: MEMBER_ID,
							presentAt: null,
							user: { name: "Ana Souza", position: "Dev" },
						},
						{
							userId: OTHER_MEMBER_ID,
							presentAt: new Date("2026-08-30T14:05:00.000Z"),
							user: { name: "Bruno Lima", position: null },
						},
					],
				}),
			);
			repositoryMock.findCreator.mockResolvedValueOnce(creator);

			const result = await meetingsService.getById(MEETING_ID);

			expect(result.attendees).toEqual([
				{
					userId: MEMBER_ID,
					name: "Ana Souza",
					position: "Dev",
					presentAt: null,
				},
				expect.objectContaining({ presentAt: expect.any(Date) }),
			]);
		});

		it("traz assignments revogadas marcadas", async () => {
			repositoryMock.findDetailById.mockResolvedValueOnce(
				detailRow({
					assignments: [
						assignmentRow(),
						assignmentRow({
							id: "0d9e8f7a-6b5c-4d3e-9f8a-1b2c3d4e5f6a",
							revokedAt: new Date("2026-08-30T16:00:00.000Z"),
						}),
					],
				}),
			);
			repositoryMock.findCreator.mockResolvedValueOnce(creator);

			const result = await meetingsService.getById(MEETING_ID);

			expect(result.assignments.map((item) => item.revokedAt)).toEqual([
				null,
				expect.any(Date),
			]);
		});

		it("mantem reuniao encerrada legivel", async () => {
			const closedAt = new Date("2026-08-30T15:42:00.000Z");
			repositoryMock.findDetailById.mockResolvedValueOnce(
				detailRow({ closedAt }),
			);
			repositoryMock.findCreator.mockResolvedValueOnce(creator);

			const result = await meetingsService.getById(MEETING_ID);

			expect(result.status).toBe("CLOSED");
			expect(result.closedAt).toEqual(closedAt);
		});

		it("lança MeetingNotFoundError para id inexistente", async () => {
			repositoryMock.findDetailById.mockResolvedValueOnce(null);

			await expect(meetingsService.getById(MEETING_ID)).rejects.toThrow(
				MeetingNotFoundError,
			);
		});
	});

	describe("addAttendees", () => {
		function mockOpenMeeting() {
			repositoryMock.findById.mockResolvedValue(meetingRow());
			repositoryMock.findUsersByIds.mockResolvedValue([
				{ id: MEMBER_ID, active: true },
				{ id: OTHER_MEMBER_ID, active: true },
			]);
		}

		it("trava a reuniao antes de ler o estado dela", async () => {
			mockOpenMeeting();
			mockDetail();

			await meetingsService.addAttendees(MEETING_ID, [MEMBER_ID]);

			expectLockedBefore(repositoryMock.findById);
		});

		it("escala membros com presentAt null", async () => {
			mockOpenMeeting();
			mockDetail();

			await meetingsService.addAttendees(MEETING_ID, [
				MEMBER_ID,
				OTHER_MEMBER_ID,
			]);

			expect(repositoryMock.addAttendees).toHaveBeenCalledWith(
				MEETING_ID,
				[MEMBER_ID, OTHER_MEMBER_ID],
				expect.anything(),
			);
		});

		it("ignora membro ja escalado sem virar erro", async () => {
			mockOpenMeeting();
			mockDetail();

			await expect(
				meetingsService.addAttendees(MEETING_ID, [MEMBER_ID]),
			).resolves.toMatchObject({ id: MEETING_ID });

			expect(repositoryMock.addAttendees).toHaveBeenCalledWith(
				MEETING_ID,
				[MEMBER_ID],
				expect.anything(),
			);
		});

		it("rejeita membro inexistente e nao cria nenhuma linha", async () => {
			repositoryMock.findById.mockResolvedValueOnce(meetingRow());
			repositoryMock.findUsersByIds.mockResolvedValueOnce([
				{ id: MEMBER_ID, active: true },
			]);

			await expect(
				meetingsService.addAttendees(MEETING_ID, [MEMBER_ID, OTHER_MEMBER_ID]),
			).rejects.toThrow(MemberNotFoundError);

			expect(repositoryMock.addAttendees).not.toHaveBeenCalled();
		});

		it("rejeita membro inativo e nao cria nenhuma linha", async () => {
			repositoryMock.findById.mockResolvedValueOnce(meetingRow());
			repositoryMock.findUsersByIds.mockResolvedValueOnce([
				{ id: MEMBER_ID, active: true },
				{ id: OTHER_MEMBER_ID, active: false },
			]);

			await expect(
				meetingsService.addAttendees(MEETING_ID, [MEMBER_ID, OTHER_MEMBER_ID]),
			).rejects.toThrow(MemberInactiveError);

			expect(repositoryMock.addAttendees).not.toHaveBeenCalled();
		});

		it("rejeita reuniao encerrada", async () => {
			repositoryMock.findById.mockResolvedValueOnce(
				meetingRow({ closedAt: new Date("2026-08-30T15:42:00.000Z") }),
			);

			await expect(
				meetingsService.addAttendees(MEETING_ID, [MEMBER_ID]),
			).rejects.toThrow(MeetingClosedError);

			expect(repositoryMock.findUsersByIds).not.toHaveBeenCalled();
			expect(repositoryMock.addAttendees).not.toHaveBeenCalled();
		});

		it("lança MeetingNotFoundError para id inexistente", async () => {
			repositoryMock.findById.mockResolvedValueOnce(null);

			await expect(
				meetingsService.addAttendees(MEETING_ID, [MEMBER_ID]),
			).rejects.toThrow(MeetingNotFoundError);
		});
	});

	describe("registerAttendance", () => {
		function mockOpenMeeting() {
			repositoryMock.findById.mockResolvedValue(meetingRow());
			repositoryMock.findKpiById.mockResolvedValue(presenceKpi);
			repositoryMock.findUsersByIds.mockResolvedValue([
				{ id: MEMBER_ID, active: true },
				{ id: OTHER_MEMBER_ID, active: true },
			]);
			repositoryMock.findAttendees.mockResolvedValue([]);
		}

		it("trava a reuniao antes de ler quem ja esta presente", async () => {
			mockOpenMeeting();
			mockDetail();

			await meetingsService.registerAttendance(
				MEETING_ID,
				{ userIds: [MEMBER_ID], kpiId: KPI_ID },
				ADMIN_ID,
			);

			expectLockedBefore(repositoryMock.findAttendees);
			expectLockedBefore(repositoryMock.findById);
		});

		it("carimba presentAt e cria um assignment por membro, todos com meetingId", async () => {
			mockOpenMeeting();
			mockDetail();

			const result = await meetingsService.registerAttendance(
				MEETING_ID,
				{ userIds: [MEMBER_ID, OTHER_MEMBER_ID], kpiId: KPI_ID },
				ADMIN_ID,
			);

			expect(repositoryMock.createPresentAttendees).toHaveBeenCalledWith(
				MEETING_ID,
				[MEMBER_ID, OTHER_MEMBER_ID],
				expect.any(Date),
				expect.anything(),
			);
			expect(repositoryMock.markAttendeesPresent).toHaveBeenCalledWith(
				MEETING_ID,
				[MEMBER_ID, OTHER_MEMBER_ID],
				expect.any(Date),
				expect.anything(),
			);
			expect(repositoryMock.createAssignments).toHaveBeenCalledWith(
				[
					{
						kpiId: KPI_ID,
						userId: MEMBER_ID,
						assignedBy: ADMIN_ID,
						meetingId: MEETING_ID,
						note: null,
						points: 5,
					},
					{
						kpiId: KPI_ID,
						userId: OTHER_MEMBER_ID,
						assignedBy: ADMIN_ID,
						meetingId: MEETING_ID,
						note: null,
						points: 5,
					},
				],
				expect.anything(),
			);
			expect(result).toMatchObject({ id: MEETING_ID });
		});

		it("congela points do KPI no momento da atribuicao", async () => {
			mockOpenMeeting();
			repositoryMock.findKpiById.mockResolvedValue({
				...presenceKpi,
				points: 7,
			});
			mockDetail();

			await meetingsService.registerAttendance(
				MEETING_ID,
				{ userIds: [MEMBER_ID], kpiId: KPI_ID },
				ADMIN_ID,
			);

			expect(repositoryMock.createAssignments).toHaveBeenCalledWith(
				[expect.objectContaining({ points: 7 })],
				expect.anything(),
			);
		});

		it("cria como attendee ja presente quem nao foi escalado", async () => {
			mockOpenMeeting();
			mockDetail();
			repositoryMock.findAttendees.mockResolvedValue([]);

			await meetingsService.registerAttendance(
				MEETING_ID,
				{ userIds: [MEMBER_ID], kpiId: KPI_ID },
				ADMIN_ID,
			);

			expect(repositoryMock.createPresentAttendees).toHaveBeenCalledWith(
				MEETING_ID,
				[MEMBER_ID],
				expect.any(Date),
				expect.anything(),
			);
		});

		it("nao cria segundo assignment para membro ja presente", async () => {
			mockOpenMeeting();
			mockDetail();
			repositoryMock.findAttendees.mockResolvedValue([
				{
					id: "x",
					meetingId: MEETING_ID,
					userId: MEMBER_ID,
					presentAt: new Date(),
				},
			]);

			await meetingsService.registerAttendance(
				MEETING_ID,
				{ userIds: [MEMBER_ID, OTHER_MEMBER_ID], kpiId: KPI_ID },
				ADMIN_ID,
			);

			expect(repositoryMock.createAssignments).toHaveBeenCalledWith(
				[
					expect.objectContaining({
						userId: OTHER_MEMBER_ID,
						meetingId: MEETING_ID,
					}),
				],
				expect.anything(),
			);
			expect(repositoryMock.createAssignments).toHaveBeenCalledTimes(1);
		});

		it("nao escreve nada quando todos ja estao presentes", async () => {
			mockOpenMeeting();
			mockDetail();
			repositoryMock.findAttendees.mockResolvedValue([
				{
					id: "x",
					meetingId: MEETING_ID,
					userId: MEMBER_ID,
					presentAt: new Date(),
				},
			]);

			await meetingsService.registerAttendance(
				MEETING_ID,
				{ userIds: [MEMBER_ID], kpiId: KPI_ID },
				ADMIN_ID,
			);

			expect(repositoryMock.createPresentAttendees).not.toHaveBeenCalled();
			expect(repositoryMock.markAttendeesPresent).not.toHaveBeenCalled();
			expect(repositoryMock.createAssignments).not.toHaveBeenCalled();
		});

		it("rejeita KPI de categoria diferente de PRESENCE", async () => {
			mockOpenMeeting();
			repositoryMock.findKpiById.mockResolvedValue(performanceKpi);

			await expect(
				meetingsService.registerAttendance(
					MEETING_ID,
					{ userIds: [MEMBER_ID], kpiId: performanceKpi.id },
					ADMIN_ID,
				),
			).rejects.toThrow(KpiNotPresenceError);

			expect(repositoryMock.createAssignments).not.toHaveBeenCalled();
		});

		it("rejeita KPI inativo", async () => {
			mockOpenMeeting();
			repositoryMock.findKpiById.mockResolvedValue(inactiveKpi);

			await expect(
				meetingsService.registerAttendance(
					MEETING_ID,
					{ userIds: [MEMBER_ID], kpiId: KPI_ID },
					ADMIN_ID,
				),
			).rejects.toThrow(KpiInactiveError);

			expect(repositoryMock.createAssignments).not.toHaveBeenCalled();
		});

		it("rejeita KPI inexistente", async () => {
			repositoryMock.findById.mockResolvedValueOnce(meetingRow());
			repositoryMock.findKpiById.mockResolvedValueOnce(null);

			await expect(
				meetingsService.registerAttendance(
					MEETING_ID,
					{ userIds: [MEMBER_ID], kpiId: KPI_ID },
					ADMIN_ID,
				),
			).rejects.toThrow(KpiNotFoundError);
		});

		it("membro inativo no meio da lista nao deixa nada criado", async () => {
			repositoryMock.findById.mockResolvedValueOnce(meetingRow());
			repositoryMock.findKpiById.mockResolvedValueOnce(presenceKpi);
			repositoryMock.findUsersByIds.mockResolvedValueOnce([
				{ id: MEMBER_ID, active: true },
				{ id: OTHER_MEMBER_ID, active: false },
			]);

			await expect(
				meetingsService.registerAttendance(
					MEETING_ID,
					{ userIds: [MEMBER_ID, OTHER_MEMBER_ID], kpiId: KPI_ID },
					ADMIN_ID,
				),
			).rejects.toThrow(MemberInactiveError);

			expect(repositoryMock.createPresentAttendees).not.toHaveBeenCalled();
			expect(repositoryMock.createAssignments).not.toHaveBeenCalled();
		});

		it("membro inexistente nao deixa nada criado", async () => {
			repositoryMock.findById.mockResolvedValueOnce(meetingRow());
			repositoryMock.findKpiById.mockResolvedValueOnce(presenceKpi);
			repositoryMock.findUsersByIds.mockResolvedValueOnce([]);

			await expect(
				meetingsService.registerAttendance(
					MEETING_ID,
					{ userIds: [MEMBER_ID], kpiId: KPI_ID },
					ADMIN_ID,
				),
			).rejects.toThrow(MemberNotFoundError);

			expect(repositoryMock.createAssignments).not.toHaveBeenCalled();
		});

		it("rejeita reuniao encerrada", async () => {
			repositoryMock.findById.mockResolvedValueOnce(
				meetingRow({ closedAt: new Date("2026-08-30T15:42:00.000Z") }),
			);

			await expect(
				meetingsService.registerAttendance(
					MEETING_ID,
					{ userIds: [MEMBER_ID], kpiId: KPI_ID },
					ADMIN_ID,
				),
			).rejects.toThrow(MeetingClosedError);

			expect(repositoryMock.createAssignments).not.toHaveBeenCalled();
		});
	});

	describe("assignKpi", () => {
		const presentAttendee = {
			id: "attendee-1",
			meetingId: MEETING_ID,
			userId: MEMBER_ID,
			presentAt: new Date("2026-08-30T14:05:00.000Z"),
		};

		function mockOpenMeetingWithPresentAttendee() {
			repositoryMock.findById.mockResolvedValue(meetingRow());
			repositoryMock.findAttendee.mockResolvedValue(presentAttendee);
			repositoryMock.findKpiById.mockResolvedValue(performanceKpi);
			repositoryMock.createAssignment.mockResolvedValue(
				assignmentRow({
					points: 12,
					kpi: {
						id: performanceKpi.id,
						name: performanceKpi.name,
						category: "PERFORMANCE",
					},
				}),
			);
		}

		it("trava a reuniao antes de conferir se esta aberta", async () => {
			mockOpenMeetingWithPresentAttendee();

			await meetingsService.assignKpi(
				MEETING_ID,
				{ kpiId: performanceKpi.id, userId: MEMBER_ID },
				ADMIN_ID,
			);

			expectLockedBefore(repositoryMock.findById);
		});

		it("cria assignment com meetingId preenchido e points congelado", async () => {
			mockOpenMeetingWithPresentAttendee();

			const result = await meetingsService.assignKpi(
				MEETING_ID,
				{
					kpiId: performanceKpi.id,
					userId: MEMBER_ID,
					note: "Excelente participação",
				},
				ADMIN_ID,
			);

			expect(repositoryMock.createAssignment).toHaveBeenCalledWith(
				expect.objectContaining({
					kpiId: performanceKpi.id,
					userId: MEMBER_ID,
					assignedBy: ADMIN_ID,
					meetingId: MEETING_ID,
					note: "Excelente participação",
					points: 12,
				}),
				expect.anything(),
			);
			expect(result).toMatchObject({ meetingId: MEETING_ID, points: 12 });
		});

		it("rejeita membro escalado mas ausente", async () => {
			repositoryMock.findById.mockResolvedValueOnce(meetingRow());
			repositoryMock.findAttendee.mockResolvedValueOnce({
				...presentAttendee,
				presentAt: null,
			});

			await expect(
				meetingsService.assignKpi(
					MEETING_ID,
					{ kpiId: performanceKpi.id, userId: MEMBER_ID },
					ADMIN_ID,
				),
			).rejects.toThrow(AttendeeNotPresentError);

			expect(repositoryMock.createAssignment).not.toHaveBeenCalled();
		});

		it("rejeita membro sem linha de attendee", async () => {
			repositoryMock.findById.mockResolvedValueOnce(meetingRow());
			repositoryMock.findAttendee.mockResolvedValueOnce(null);

			await expect(
				meetingsService.assignKpi(
					MEETING_ID,
					{ kpiId: performanceKpi.id, userId: MEMBER_ID },
					ADMIN_ID,
				),
			).rejects.toThrow(AttendeeNotPresentError);
		});

		it("aceita KPI de categoria PRESENCE", async () => {
			repositoryMock.findById.mockResolvedValueOnce(meetingRow());
			repositoryMock.findAttendee.mockResolvedValueOnce(presentAttendee);
			repositoryMock.findKpiById.mockResolvedValueOnce(presenceKpi);
			repositoryMock.createAssignment.mockResolvedValueOnce(assignmentRow());

			await expect(
				meetingsService.assignKpi(
					MEETING_ID,
					{ kpiId: KPI_ID, userId: MEMBER_ID },
					ADMIN_ID,
				),
			).resolves.toMatchObject({ kpiId: KPI_ID });
		});

		it("rejeita KPI inativo", async () => {
			repositoryMock.findById.mockResolvedValueOnce(meetingRow());
			repositoryMock.findAttendee.mockResolvedValueOnce(presentAttendee);
			repositoryMock.findKpiById.mockResolvedValueOnce(inactiveKpi);

			await expect(
				meetingsService.assignKpi(
					MEETING_ID,
					{ kpiId: KPI_ID, userId: MEMBER_ID },
					ADMIN_ID,
				),
			).rejects.toThrow(KpiInactiveError);
		});

		it("rejeita reuniao encerrada", async () => {
			repositoryMock.findById.mockResolvedValueOnce(
				meetingRow({ closedAt: new Date("2026-08-30T15:42:00.000Z") }),
			);

			await expect(
				meetingsService.assignKpi(
					MEETING_ID,
					{ kpiId: performanceKpi.id, userId: MEMBER_ID },
					ADMIN_ID,
				),
			).rejects.toThrow(MeetingClosedError);

			expect(repositoryMock.createAssignment).not.toHaveBeenCalled();
		});
	});

	describe("end", () => {
		it("trava a reuniao antes de conferir se ja foi encerrada", async () => {
			repositoryMock.findById.mockResolvedValueOnce(meetingRow());
			mockDetail();

			await meetingsService.end(MEETING_ID);

			expectLockedBefore(repositoryMock.findById);
		});

		it("preenche closedAt e devolve status CLOSED", async () => {
			const closedAt = new Date("2026-08-30T15:42:00.000Z");
			repositoryMock.findById.mockResolvedValueOnce(meetingRow());
			repositoryMock.close.mockResolvedValueOnce(meetingRow({ closedAt }));
			repositoryMock.findDetailById.mockResolvedValueOnce(
				detailRow({ closedAt }),
			);
			repositoryMock.findCreator.mockResolvedValueOnce(creator);

			const result = await meetingsService.end(MEETING_ID);

			expect(repositoryMock.close).toHaveBeenCalledWith(
				MEETING_ID,
				expect.any(Date),
				expect.anything(),
			);
			expect(result.status).toBe("CLOSED");
			expect(result.closedAt).toEqual(closedAt);
		});

		it("rejeita segunda chamada com MeetingAlreadyClosedError", async () => {
			repositoryMock.findById.mockResolvedValueOnce(
				meetingRow({ closedAt: new Date("2026-08-30T15:42:00.000Z") }),
			);

			await expect(meetingsService.end(MEETING_ID)).rejects.toThrow(
				MeetingAlreadyClosedError,
			);

			expect(repositoryMock.close).not.toHaveBeenCalled();
		});

		it("permite encerrar reuniao sem nenhum presente", async () => {
			repositoryMock.findById.mockResolvedValueOnce(meetingRow());
			repositoryMock.close.mockResolvedValueOnce(
				meetingRow({ closedAt: new Date() }),
			);
			mockDetail();

			await expect(meetingsService.end(MEETING_ID)).resolves.toMatchObject({
				id: MEETING_ID,
			});
		});

		it("lança MeetingNotFoundError para id inexistente", async () => {
			repositoryMock.findById.mockResolvedValueOnce(null);

			await expect(meetingsService.end(MEETING_ID)).rejects.toThrow(
				MeetingNotFoundError,
			);
		});
	});

	describe("list", () => {
		it("encaminha o filtro para o repository", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [], total: 0 });

			const input = {
				status: "CLOSED" as const,
				from: new Date("2026-08-01"),
				to: new Date("2026-08-31"),
				page: 2,
				limit: 10,
			};

			await meetingsService.list(input);

			expect(repositoryMock.list).toHaveBeenCalledWith(input);
		});

		it("mapeia contadores de cada reuniao", async () => {
			repositoryMock.list.mockResolvedValueOnce({
				items: [
					{
						id: MEETING_ID,
						title: "Reunião semanal",
						date: new Date("2026-08-30T00:00:00.000Z"),
						closedAt: null,
						attendees: [{ presentAt: null }, { presentAt: new Date() }],
						_count: { assignments: 3 },
					},
				],
				total: 1,
			});

			const result = await meetingsService.list({
				status: "ALL",
				page: 1,
				limit: 20,
			});

			expect(result.items[0]).toEqual({
				id: MEETING_ID,
				title: "Reunião semanal",
				date: new Date("2026-08-30T00:00:00.000Z"),
				status: "OPEN",
				closedAt: null,
				attendeeCount: 2,
				presentCount: 1,
				assignmentCount: 3,
			});
		});

		it("mapeia reuniao encerrada com status CLOSED", async () => {
			const closedAt = new Date("2026-08-30T15:42:00.000Z");
			repositoryMock.list.mockResolvedValueOnce({
				items: [
					{
						id: MEETING_ID,
						title: "Reunião semanal",
						date: new Date("2026-08-30T00:00:00.000Z"),
						closedAt,
						attendees: [],
						_count: { assignments: 0 },
					},
				],
				total: 1,
			});

			const result = await meetingsService.list({
				status: "ALL",
				page: 1,
				limit: 20,
			});

			expect(result.items[0]).toMatchObject({ status: "CLOSED", closedAt });
		});

		it("calcula totalPages e devolve lista vazia para pagina alem do fim", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [], total: 45 });

			const result = await meetingsService.list({
				status: "ALL",
				page: 3,
				limit: 20,
			});

			expect(result).toMatchObject({
				items: [],
				page: 3,
				limit: 20,
				total: 45,
				totalPages: 3,
			});
		});

		it("totalPages minimo e 1 quando nao ha reunioes", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [], total: 0 });

			const result = await meetingsService.list({
				status: "ALL",
				page: 1,
				limit: 20,
			});

			expect(result.totalPages).toBe(1);
		});
	});
});
