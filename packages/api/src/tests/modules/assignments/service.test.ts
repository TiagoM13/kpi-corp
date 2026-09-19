import { beforeEach, describe, expect, it, vi } from "vitest";

import { assignmentsService } from "../../../modules/assignments/assignments.service";

const { repositoryMock } = vi.hoisted(() => ({
	repositoryMock: {
		create: vi.fn(),
		createMany: vi.fn(),
		listByUser: vi.fn(),
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
});
