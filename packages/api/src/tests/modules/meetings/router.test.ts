import { createProcedureClient, ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { meetingsRouter } from "../../../modules/meetings/meetings.router";
import type { Context } from "../../../shared/context";

const { serviceMock } = vi.hoisted(() => ({
	serviceMock: {
		create: vi.fn(),
		list: vi.fn(),
		getById: vi.fn(),
		addAttendees: vi.fn(),
		registerAttendance: vi.fn(),
		assignKpi: vi.fn(),
		end: vi.fn(),
	},
}));

vi.mock("../../../modules/meetings/meetings.service", () => ({
	meetingsService: serviceMock,
}));

const ADMIN_ID = "b29f5637-0ab1-4de0-b2d2-d364e3903124";
const MEMBER_ID = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";
const OTHER_MEMBER_ID = "7c1d9e2f-3a4b-4c5d-8e6f-1a2b3c4d5e6f";
const MEETING_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const KPI_ID = "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8";

const anonymous: Context = { headers: {}, auth: null };
const asMember: Context = {
	headers: {},
	auth: {
		userId: MEMBER_ID,
		email: "ana@kpicorp.com",
		role: "MEMBER",
	},
};
const asAdmin: Context = {
	headers: {},
	auth: {
		userId: ADMIN_ID,
		email: "admin@kpicorp.com",
		role: "ADMIN",
	},
};

const meetingDetail = {
	id: MEETING_ID,
	title: "Reunião semanal",
	date: new Date("2026-08-30T00:00:00.000Z"),
	status: "OPEN" as const,
	closedAt: null,
	createdAt: new Date("2026-08-30T14:00:00.000Z"),
	createdBy: { id: ADMIN_ID, name: "Administrador" },
	attendees: [],
	assignments: [],
};

const assignment = {
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
};

const listResponse = {
	items: [
		{
			id: MEETING_ID,
			title: "Reunião semanal",
			date: new Date("2026-08-30T00:00:00.000Z"),
			status: "OPEN" as const,
			closedAt: null,
			attendeeCount: 2,
			presentCount: 1,
			assignmentCount: 3,
		},
	],
	page: 1,
	limit: 20,
	total: 1,
	totalPages: 1,
};

function caller(context: Context) {
	return {
		create: createProcedureClient(meetingsRouter.create, { context }),
		list: createProcedureClient(meetingsRouter.list, { context }),
		getById: createProcedureClient(meetingsRouter.getById, { context }),
		addAttendees: createProcedureClient(meetingsRouter.addAttendees, {
			context,
		}),
		registerAttendance: createProcedureClient(
			meetingsRouter.registerAttendance,
			{ context },
		),
		assignKpi: createProcedureClient(meetingsRouter.assignKpi, { context }),
		end: createProcedureClient(meetingsRouter.end, { context }),
	};
}

async function codeOf(call: Promise<unknown>) {
	const error = await call.catch((err: unknown) => err);

	expect(error).toBeInstanceOf(ORPCError);

	return (error as ORPCError<string, unknown>).code;
}

const VALID = {
	create: { title: "Reunião semanal", date: "2026-08-30" },
	list: {},
	getById: { id: MEETING_ID },
	addAttendees: { id: MEETING_ID, userIds: [MEMBER_ID] },
	registerAttendance: {
		id: MEETING_ID,
		userIds: [MEMBER_ID],
		kpiId: KPI_ID,
	},
	assignKpi: { id: MEETING_ID, kpiId: KPI_ID, userId: MEMBER_ID },
	end: { id: MEETING_ID },
};

describe("meetings router", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("authorization", () => {
		const routes = [
			"create",
			"list",
			"getById",
			"addAttendees",
			"registerAttendance",
			"assignKpi",
			"end",
		] as const;

		it.each(routes)("rejects an anonymous request to %s", async (route) => {
			expect(
				await codeOf(caller(anonymous)[route](VALID[route] as never)),
			).toBe("UNAUTHORIZED");
		});

		it.each(routes)("rejects a member on %s", async (route) => {
			expect(await codeOf(caller(asMember)[route](VALID[route] as never))).toBe(
				"FORBIDDEN",
			);
		});

		it.each(routes)(
			"does not reach the service for a member on %s",
			async (route) => {
				await caller(asMember)
					[route](VALID[route] as never)
					.catch(() => {});

				expect(serviceMock[route]).not.toHaveBeenCalled();
			},
		);

		it.each(routes)("lets an admin through on %s", async (route) => {
			serviceMock.create.mockResolvedValue(meetingDetail);
			serviceMock.list.mockResolvedValue(listResponse);
			serviceMock.getById.mockResolvedValue(meetingDetail);
			serviceMock.addAttendees.mockResolvedValue(meetingDetail);
			serviceMock.registerAttendance.mockResolvedValue(meetingDetail);
			serviceMock.assignKpi.mockResolvedValue(assignment);
			serviceMock.end.mockResolvedValue(meetingDetail);

			await expect(
				caller(asAdmin)[route](VALID[route] as never),
			).resolves.toBeDefined();
		});
	});

	describe("create", () => {
		it("aceita uma reuniao valida e passa createdBy do contexto", async () => {
			serviceMock.create.mockResolvedValueOnce(meetingDetail);

			await caller(asAdmin).create(VALID.create);

			expect(serviceMock.create).toHaveBeenCalledWith(
				{
					title: "Reunião semanal",
					date: new Date("2026-08-30T00:00:00.000Z"),
				},
				ADMIN_ID,
			);
		});

		it("ignora createdBy mandado no corpo", async () => {
			serviceMock.create.mockResolvedValueOnce(meetingDetail);

			await caller(asAdmin).create({
				...VALID.create,
				createdBy: MEMBER_ID,
			} as never);

			expect(serviceMock.create).toHaveBeenCalledWith(
				expect.not.objectContaining({ createdBy: expect.anything() }),
				ADMIN_ID,
			);
		});

		it.each(["", "   "])("rejects an empty title %j", async (title) => {
			await expect(
				caller(asAdmin).create({ ...VALID.create, title }),
			).rejects.toThrow();
			expect(serviceMock.create).not.toHaveBeenCalled();
		});

		it("rejects a title above 120 characters", async () => {
			await expect(
				caller(asAdmin).create({ ...VALID.create, title: "a".repeat(121) }),
			).rejects.toThrow();
			expect(serviceMock.create).not.toHaveBeenCalled();
		});

		it.each([
			"2026-08-30T14:00:00.000Z",
			"30/08/2026",
			"2026-13-01",
			"2026-02-30",
			"not-a-date",
		])("rejects the invalid date %j", async (date) => {
			await expect(
				caller(asAdmin).create({ ...VALID.create, date }),
			).rejects.toThrow();
			expect(serviceMock.create).not.toHaveBeenCalled();
		});
	});

	describe("getById", () => {
		it("rejects an id that is not a uuid", async () => {
			await expect(caller(asAdmin).getById({ id: "abc" })).rejects.toThrow();
			expect(serviceMock.getById).not.toHaveBeenCalled();
		});

		it("passes the id through", async () => {
			serviceMock.getById.mockResolvedValueOnce(meetingDetail);

			await caller(asAdmin).getById(VALID.getById);

			expect(serviceMock.getById).toHaveBeenCalledWith(MEETING_ID);
		});
	});

	describe("list", () => {
		beforeEach(() => {
			serviceMock.list.mockResolvedValue(listResponse);
		});

		it("applies the defaults status=ALL, page=1, limit=20", async () => {
			await caller(asAdmin).list({});

			expect(serviceMock.list).toHaveBeenCalledWith(
				expect.objectContaining({ status: "ALL", page: 1, limit: 20 }),
			);
		});

		it("parses from/to as calendar dates", async () => {
			await caller(asAdmin).list({
				from: "2026-08-01",
				to: "2026-08-31",
			});

			expect(serviceMock.list).toHaveBeenCalledWith(
				expect.objectContaining({
					from: new Date("2026-08-01T00:00:00.000Z"),
					to: new Date("2026-08-31T00:00:00.000Z"),
				}),
			);
		});

		it("treats cleared filters as absent", async () => {
			await caller(asAdmin).list({
				status: "" as never,
				from: "" as never,
				to: "" as never,
				page: "" as never,
				limit: "" as never,
			});

			expect(serviceMock.list).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "ALL",
					from: undefined,
					to: undefined,
					page: 1,
					limit: 20,
				}),
			);
		});

		it("rejects a status outside the enum", async () => {
			await expect(
				caller(asAdmin).list({ status: "DONE" as never }),
			).rejects.toThrow();
			expect(serviceMock.list).not.toHaveBeenCalled();
		});

		it("rejects an invalid from date", async () => {
			await expect(
				caller(asAdmin).list({ from: "2026-08-32" }),
			).rejects.toThrow();
			expect(serviceMock.list).not.toHaveBeenCalled();
		});
	});

	describe("addAttendees", () => {
		it("passes id and userIds through", async () => {
			serviceMock.addAttendees.mockResolvedValueOnce(meetingDetail);

			await caller(asAdmin).addAttendees({
				id: MEETING_ID,
				userIds: [MEMBER_ID, OTHER_MEMBER_ID],
			});

			expect(serviceMock.addAttendees).toHaveBeenCalledWith(MEETING_ID, [
				MEMBER_ID,
				OTHER_MEMBER_ID,
			]);
		});

		it("rejects an empty userIds list", async () => {
			await expect(
				caller(asAdmin).addAttendees({ id: MEETING_ID, userIds: [] }),
			).rejects.toThrow();
			expect(serviceMock.addAttendees).not.toHaveBeenCalled();
		});

		it("rejects duplicated userIds", async () => {
			await expect(
				caller(asAdmin).addAttendees({
					id: MEETING_ID,
					userIds: [MEMBER_ID, MEMBER_ID],
				}),
			).rejects.toThrow();
			expect(serviceMock.addAttendees).not.toHaveBeenCalled();
		});
	});

	describe("registerAttendance", () => {
		it("passes id, userIds, kpiId and the admin id through", async () => {
			serviceMock.registerAttendance.mockResolvedValueOnce(meetingDetail);

			await caller(asAdmin).registerAttendance(VALID.registerAttendance);

			expect(serviceMock.registerAttendance).toHaveBeenCalledWith(
				MEETING_ID,
				{ userIds: [MEMBER_ID], kpiId: KPI_ID },
				ADMIN_ID,
			);
		});

		it("rejects duplicated userIds", async () => {
			await expect(
				caller(asAdmin).registerAttendance({
					...VALID.registerAttendance,
					userIds: [MEMBER_ID, MEMBER_ID],
				}),
			).rejects.toThrow();
			expect(serviceMock.registerAttendance).not.toHaveBeenCalled();
		});
	});

	describe("assignKpi", () => {
		it("passes id, fields and the admin id through", async () => {
			serviceMock.assignKpi.mockResolvedValueOnce(assignment);

			await caller(asAdmin).assignKpi({
				...VALID.assignKpi,
				note: "Excelente participação",
			});

			expect(serviceMock.assignKpi).toHaveBeenCalledWith(
				MEETING_ID,
				{ kpiId: KPI_ID, userId: MEMBER_ID, note: "Excelente participação" },
				ADMIN_ID,
			);
		});

		it("rejects a note above 500 characters", async () => {
			await expect(
				caller(asAdmin).assignKpi({
					...VALID.assignKpi,
					note: "a".repeat(501),
				}),
			).rejects.toThrow();
			expect(serviceMock.assignKpi).not.toHaveBeenCalled();
		});

		it("rejects an id that is not a uuid", async () => {
			await expect(
				caller(asAdmin).assignKpi({ ...VALID.assignKpi, id: "abc" }),
			).rejects.toThrow();
			expect(serviceMock.assignKpi).not.toHaveBeenCalled();
		});
	});

	describe("end", () => {
		it("rejects an id that is not a uuid", async () => {
			await expect(caller(asAdmin).end({ id: "abc" })).rejects.toThrow();
			expect(serviceMock.end).not.toHaveBeenCalled();
		});

		it("passes the id through", async () => {
			serviceMock.end.mockResolvedValueOnce({
				...meetingDetail,
				status: "CLOSED" as const,
				closedAt: new Date("2026-08-30T15:42:00.000Z"),
			});

			const result = await caller(asAdmin).end(VALID.end);

			expect(serviceMock.end).toHaveBeenCalledWith(MEETING_ID);
			expect(result.status).toBe("CLOSED");
		});
	});
});
