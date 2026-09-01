import { createProcedureClient, ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { membersRouter } from "../../../modules/members/members.router";
import type { Context } from "../../../shared/context";

const { serviceMock } = vi.hoisted(() => ({
	serviceMock: {
		list: vi.fn(),
		getById: vi.fn(),
		invite: vi.fn(),
		setStatus: vi.fn(),
	},
}));

vi.mock("../../../modules/members/members.service", () => ({
	membersService: serviceMock,
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

const member = {
	id: MEMBER_ID,
	name: "Ana Souza",
	email: "ana@kpicorp.com",
	role: "MEMBER" as const,
	position: "Designer",
	active: true,
	createdAt: new Date(),
};

function caller(context: Context) {
	return {
		list: createProcedureClient(membersRouter.list, { context }),
		getById: createProcedureClient(membersRouter.getById, { context }),
		invite: createProcedureClient(membersRouter.invite, { context }),
		setStatus: createProcedureClient(membersRouter.setStatus, { context }),
	};
}

async function codeOf(call: Promise<unknown>) {
	const error = await call.catch((err: unknown) => err);

	expect(error).toBeInstanceOf(ORPCError);

	return (error as ORPCError<string, unknown>).code;
}

describe("members router", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("authorization", () => {
		const routes = ["list", "getById", "invite", "setStatus"] as const;

		const inputFor = {
			list: {},
			getById: { id: MEMBER_ID },
			invite: { emails: ["novo@kpicorp.com"] },
			setStatus: { id: MEMBER_ID, active: false },
		};

		it.each(routes)(
			"should reject an anonymous request to %s",
			async (route) => {
				expect(
					await codeOf(caller(anonymous)[route](inputFor[route] as never)),
				).toBe("UNAUTHORIZED");
			},
		);

		it.each(routes)("should reject a member on %s", async (route) => {
			expect(
				await codeOf(caller(asMember)[route](inputFor[route] as never)),
			).toBe("FORBIDDEN");
		});

		it.each(routes)(
			"should not reach the service for a member on %s",
			async (route) => {
				await caller(asMember)
					[route](inputFor[route] as never)
					.catch(() => {});

				expect(serviceMock[route]).not.toHaveBeenCalled();
			},
		);
	});

	describe("list", () => {
		it("should apply the default page, limit and status", async () => {
			serviceMock.list.mockResolvedValueOnce({
				items: [],
				page: 1,
				limit: 20,
				total: 0,
				totalPages: 1,
			});

			await caller(asAdmin).list({});

			expect(serviceMock.list).toHaveBeenCalledWith({
				page: 1,
				limit: 20,
				status: "ALL",
			});
		});

		it("should treat cleared query filters as absent", async () => {
			serviceMock.list.mockResolvedValueOnce({
				items: [],
				page: 1,
				limit: 20,
				total: 0,
				totalPages: 1,
			});

			await caller(asAdmin).list({
				page: "" as never,
				limit: "" as never,
				search: "" as never,
				status: "" as never,
			});

			expect(serviceMock.list).toHaveBeenCalledWith({
				page: 1,
				limit: 20,
				status: "ALL",
			});
		});

		it("should reject a limit above 100", async () => {
			await expect(caller(asAdmin).list({ limit: 101 })).rejects.toThrow();
			expect(serviceMock.list).not.toHaveBeenCalled();
		});

		it("should reject page zero", async () => {
			await expect(caller(asAdmin).list({ page: 0 })).rejects.toThrow();
		});
	});

	describe("getById", () => {
		it("should return the member", async () => {
			serviceMock.getById.mockResolvedValueOnce(member);

			expect(await caller(asAdmin).getById({ id: MEMBER_ID })).toMatchObject({
				id: MEMBER_ID,
			});
		});

		it("should reject an id that is not a uuid", async () => {
			await expect(caller(asAdmin).getById({ id: "abc" })).rejects.toThrow();
			expect(serviceMock.getById).not.toHaveBeenCalled();
		});
	});

	describe("invite", () => {
		it("should pass the address list through", async () => {
			serviceMock.invite.mockResolvedValueOnce({ created: [], failed: [] });

			await caller(asAdmin).invite({ emails: ["a@kpicorp.com"] });

			expect(serviceMock.invite).toHaveBeenCalledWith(["a@kpicorp.com"]);
		});

		it("should reject an empty list", async () => {
			await expect(caller(asAdmin).invite({ emails: [] })).rejects.toThrow();
		});

		it("should reject more than 50 addresses", async () => {
			const emails = Array.from({ length: 51 }, (_, i) => `u${i}@kpicorp.com`);

			await expect(caller(asAdmin).invite({ emails })).rejects.toThrow();
		});

		it("should reject a malformed address", async () => {
			await expect(
				caller(asAdmin).invite({ emails: ["nao-e-email"] }),
			).rejects.toThrow();
		});
	});

	describe("setStatus", () => {
		it("should pass the authenticated admin as the requester", async () => {
			serviceMock.setStatus.mockResolvedValueOnce({ ...member, active: false });

			await caller(asAdmin).setStatus({ id: MEMBER_ID, active: false });

			expect(serviceMock.setStatus).toHaveBeenCalledWith({
				id: MEMBER_ID,
				active: false,
				requestedBy: ADMIN_ID,
			});
		});
	});
});
