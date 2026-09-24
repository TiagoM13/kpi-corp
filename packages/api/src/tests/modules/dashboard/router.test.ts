import { createProcedureClient, ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemberInactiveError } from "../../../modules/dashboard/dashboard.errors";
import { dashboardRouter } from "../../../modules/dashboard/dashboard.router";
import type { Context } from "../../../shared/context";
import { levelFor } from "../../../shared/gamification";

const { serviceMock } = vi.hoisted(() => ({
	serviceMock: {
		getMemberDashboard: vi.fn(),
		getAdminDashboard: vi.fn(),
	},
}));

vi.mock("../../../modules/dashboard/dashboard.service", () => ({
	dashboardService: serviceMock,
}));

const ADMIN_ID = "b29f5637-0ab1-4de0-b2d2-d364e3903124";
const MEMBER_ID = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";

const anonymous: Context = { headers: {}, auth: null };
const asMember: Context = {
	headers: {},
	auth: { userId: MEMBER_ID, email: "ana@kpicorp.com", role: "MEMBER" },
};
const asAdmin: Context = {
	headers: {},
	auth: { userId: ADMIN_ID, email: "admin@kpicorp.com", role: "ADMIN" },
};

const memberDashboard = {
	user: { id: MEMBER_ID, name: "Ana Souza", position: "Dev", role: "MEMBER" },
	points: 850,
	kpiCount: 18,
	rankingPosition: 4,
	teamSize: 12,
	level: levelFor(850),
	recentKpis: [],
};

const adminDashboard = {
	members: { active: 3, total: 4 },
	kpis: { week: 2, month: 7 },
	meetings: { week: 1, month: 4, open: 1 },
	points: { week: 30, month: 120 },
	ranking: [],
	recentAssignments: [],
	membersWithoutKpis: [],
};

function caller(context: Context) {
	return {
		getMember: createProcedureClient(dashboardRouter.getMember, { context }),
		getAdmin: createProcedureClient(dashboardRouter.getAdmin, { context }),
	};
}

async function codeOf(call: Promise<unknown>) {
	const error = await call.catch((err: unknown) => err);

	expect(error).toBeInstanceOf(ORPCError);

	return (error as ORPCError<string, unknown>).code;
}

describe("dashboard router", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		serviceMock.getMemberDashboard.mockResolvedValue(memberDashboard);
		serviceMock.getAdminDashboard.mockResolvedValue(adminDashboard);
	});

	describe("/dashboard/member", () => {
		it("rejects an anonymous request with UNAUTHORIZED", async () => {
			expect(await codeOf(caller(anonymous).getMember())).toBe("UNAUTHORIZED");
			expect(serviceMock.getMemberDashboard).not.toHaveBeenCalled();
		});

		it("lets a member through, scoped to the authenticated user", async () => {
			await expect(caller(asMember).getMember()).resolves.toMatchObject({
				rankingPosition: 4,
				teamSize: 12,
			});
			expect(serviceMock.getMemberDashboard).toHaveBeenCalledWith(MEMBER_ID);
		});

		it("lets an admin through, with their own member dashboard", async () => {
			await caller(asAdmin).getMember();

			expect(serviceMock.getMemberDashboard).toHaveBeenCalledWith(ADMIN_ID);
		});

		it("maps MemberInactiveError to 403 with MEMBER_INACTIVE", async () => {
			serviceMock.getMemberDashboard.mockRejectedValueOnce(
				new MemberInactiveError(),
			);

			const error = await caller(asMember)
				.getMember()
				.catch((err: unknown) => err);

			expect((error as ORPCError<string, unknown>).code).toBe("FORBIDDEN");
			expect((error as ORPCError<string, { code: string }>).data.code).toBe(
				"MEMBER_INACTIVE",
			);
		});
	});

	describe("/dashboard/admin", () => {
		it("rejects an anonymous request with UNAUTHORIZED", async () => {
			expect(await codeOf(caller(anonymous).getAdmin())).toBe("UNAUTHORIZED");
		});

		it("rejects a member with FORBIDDEN, without reaching the service", async () => {
			expect(await codeOf(caller(asMember).getAdmin())).toBe("FORBIDDEN");
			expect(serviceMock.getAdminDashboard).not.toHaveBeenCalled();
		});

		it("lets an admin through", async () => {
			await expect(caller(asAdmin).getAdmin()).resolves.toEqual(adminDashboard);
		});
	});
});
