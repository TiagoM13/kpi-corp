import { createProcedureClient, ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { assignmentsRouter } from "../../../modules/assignments/assignments.router";
import type { Context } from "../../../shared/context";

const { serviceMock } = vi.hoisted(() => ({
	serviceMock: {
		assign: vi.fn(),
		bulkAssign: vi.fn(),
		list: vi.fn(),
		listByMember: vi.fn(),
		revoke: vi.fn(),
	},
}));

vi.mock("../../../modules/assignments/assignments.service", () => ({
	assignmentsService: serviceMock,
}));

const ADMIN_ID = "b29f5637-0ab1-4de0-b2d2-d364e3903124";
const MEMBER_ID = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";
const KPI_ID = "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8";

const anonymous: Context = { headers: {}, auth: null };
const asMember: Context = {
	headers: {},
	auth: { userId: MEMBER_ID, email: "ana@kpicorp.com", role: "MEMBER" },
};
const asAdmin: Context = {
	headers: {},
	auth: { userId: ADMIN_ID, email: "admin@kpicorp.com", role: "ADMIN" },
};

const historyItem = {
	id: "9e2f7a1c-4b8d-4c1e-9a3f-2d5b6c7e8f90",
	kpiId: KPI_ID,
	userId: MEMBER_ID,
	assignedBy: ADMIN_ID,
	meetingId: null,
	note: null,
	points: 25,
	revokedAt: null,
	assignedAt: new Date("2026-08-30T14:12:00.000Z"),
	kpi: { id: KPI_ID, name: "Resolveu bug crítico", category: "PERFORMANCE" },
	user: { id: MEMBER_ID, name: "Ana Souza", position: "Dev" },
};

const historyPage = {
	items: [historyItem],
	page: 1,
	limit: 20,
	total: 1,
	totalPages: 1,
};

function caller(context: Context) {
	return {
		list: createProcedureClient(assignmentsRouter.list, { context }),
		listByMember: createProcedureClient(assignmentsRouter.listByMember, {
			context,
		}),
		bulkAssign: createProcedureClient(assignmentsRouter.bulkAssign, {
			context,
		}),
	};
}

async function codeOf(call: Promise<unknown>) {
	const error = await call.catch((err: unknown) => err);

	expect(error).toBeInstanceOf(ORPCError);

	return (error as ORPCError<string, unknown>).code;
}

describe("assignments router — GET /kpi-assignments", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		serviceMock.list.mockResolvedValue(historyPage);
		serviceMock.listByMember.mockResolvedValue({ items: [] });
	});

	describe("authorization", () => {
		it("rejects an anonymous request with UNAUTHORIZED", async () => {
			expect(await codeOf(caller(anonymous).list({}))).toBe("UNAUTHORIZED");
			expect(serviceMock.list).not.toHaveBeenCalled();
		});

		it("rejects a member with FORBIDDEN, without reaching the service", async () => {
			expect(await codeOf(caller(asMember).list({}))).toBe("FORBIDDEN");
			expect(serviceMock.list).not.toHaveBeenCalled();
		});

		it("lets an admin through", async () => {
			await expect(caller(asAdmin).list({})).resolves.toMatchObject({
				total: 1,
				items: [{ user: { name: "Ana Souza" } }],
			});
		});
	});

	describe("input", () => {
		it("defaults to page 1 and limit 20, with no filter", async () => {
			await caller(asAdmin).list({});

			expect(serviceMock.list).toHaveBeenCalledWith({
				page: 1,
				limit: 20,
				revoked: undefined,
			});
		});

		it("forwards every filter combined", async () => {
			await caller(asAdmin).list({
				userId: MEMBER_ID,
				kpiId: KPI_ID,
				category: "PERFORMANCE",
				from: "2026-08-01",
				to: "2026-08-31",
				revoked: "false" as never,
				page: "2" as never,
				limit: "50" as never,
			});

			expect(serviceMock.list).toHaveBeenCalledWith({
				userId: MEMBER_ID,
				kpiId: KPI_ID,
				category: "PERFORMANCE",
				from: "2026-08-01",
				to: "2026-08-31",
				revoked: false,
				page: 2,
				limit: 50,
			});
		});

		it("reads revoked=true as true", async () => {
			await caller(asAdmin).list({ revoked: "true" as never });

			expect(serviceMock.list).toHaveBeenCalledWith(
				expect.objectContaining({ revoked: true }),
			);
		});

		it("treats cleared filters as absent", async () => {
			await caller(asAdmin).list({
				userId: "" as never,
				category: "" as never,
				from: "",
				revoked: "" as never,
			});

			expect(serviceMock.list).toHaveBeenCalledWith({
				page: 1,
				limit: 20,
				revoked: undefined,
			});
		});

		it("accepts from equal to to", async () => {
			await expect(
				caller(asAdmin).list({ from: "2026-08-31", to: "2026-08-31" }),
			).resolves.toBeDefined();
		});

		it.each([
			["userId that is not a uuid", { userId: "abc" }],
			["kpiId that is not a uuid", { kpiId: "abc" }],
			["category outside the enum", { category: "SALES" }],
			["from outside YYYY-MM-DD", { from: "01/08/2026" }],
			["to that is not a real day", { to: "2026-02-30" }],
			["to before from", { from: "2026-08-31", to: "2026-08-01" }],
			["limit above 100", { limit: 101 }],
			["page below 1", { page: 0 }],
		])("rejects a %s before the service", async (_, input) => {
			expect(await codeOf(caller(asAdmin).list(input as never))).toBe(
				"BAD_REQUEST",
			);
			expect(serviceMock.list).not.toHaveBeenCalled();
		});
	});

	describe("the 2B route stays as it was", () => {
		it("GET /members/{id}/kpi-assignments still answers unpaginated items", async () => {
			await expect(
				caller(asAdmin).listByMember({ id: MEMBER_ID }),
			).resolves.toEqual({ items: [] });

			expect(serviceMock.listByMember).toHaveBeenCalledWith(MEMBER_ID, {
				category: undefined,
				revoked: undefined,
			});
			expect(serviceMock.list).not.toHaveBeenCalled();
		});
	});
});

describe("assignments router — POST /kpi-assignments/bulk", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		serviceMock.bulkAssign.mockResolvedValue([]);
	});

	function userIds(count: number) {
		return Array.from(
			{ length: count },
			(_, index) =>
				`00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
		);
	}

	it("aceita até 200 membros", async () => {
		await expect(
			caller(asAdmin).bulkAssign({ kpiId: KPI_ID, userIds: userIds(200) }),
		).resolves.toEqual({ items: [] });
	});

	it("rejeita mais de 200 membros sem chegar ao service", async () => {
		expect(
			await codeOf(
				caller(asAdmin).bulkAssign({ kpiId: KPI_ID, userIds: userIds(201) }),
			),
		).toBe("BAD_REQUEST");
		expect(serviceMock.bulkAssign).not.toHaveBeenCalled();
	});
});
