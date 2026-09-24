import { createProcedureClient, ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PeriodNotAllowedError } from "../../../modules/ranking/ranking.errors";
import { rankingRouter } from "../../../modules/ranking/ranking.router";
import type { Context } from "../../../shared/context";

const { serviceMock } = vi.hoisted(() => ({
	serviceMock: {
		getRanking: vi.fn(),
	},
}));

vi.mock("../../../modules/ranking/ranking.service", () => ({
	rankingService: serviceMock,
}));

const ADMIN_ID = "b29f5637-0ab1-4de0-b2d2-d364e3903124";
const MEMBER_ID = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";

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

const rankingResponse = {
	period: "week" as const,
	periodStart: "2026-09-14",
	periodEnd: "2026-09-20",
	items: [
		{
			position: 1,
			member: {
				id: ADMIN_ID,
				name: "Administrador",
				position: null,
				role: "ADMIN" as const,
			},
			points: 20,
			kpiCount: 2,
			change: 1,
			isMe: false,
		},
		{
			position: 2,
			member: {
				id: MEMBER_ID,
				name: "Ana Souza",
				position: "Dev",
				role: "MEMBER" as const,
			},
			points: 10,
			kpiCount: 1,
			change: null,
			isMe: true,
		},
	],
	me: { position: 2, points: 10, kpiCount: 1, change: null },
};

function caller(context: Context) {
	return {
		get: createProcedureClient(rankingRouter.get, { context }),
	};
}

async function codeOf(call: Promise<unknown>) {
	const error = await call.catch((err: unknown) => err);

	expect(error).toBeInstanceOf(ORPCError);

	return (error as ORPCError<string, unknown>).code;
}

describe("ranking router", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		serviceMock.getRanking.mockResolvedValue(rankingResponse);
	});

	describe("authorization", () => {
		it("rejects an anonymous request with UNAUTHORIZED", async () => {
			expect(await codeOf(caller(anonymous).get({}))).toBe("UNAUTHORIZED");
			expect(serviceMock.getRanking).not.toHaveBeenCalled();
		});

		it.each(["week", "month", "all"] as const)(
			"lets a member through on period=%s",
			async (period) => {
				await expect(caller(asMember).get({ period })).resolves.toBeDefined();

				expect(serviceMock.getRanking).toHaveBeenCalledWith(
					period,
					asMember.auth,
				);
			},
		);

		it("passes the authenticated user to the service", async () => {
			await caller(asMember).get({ period: "week" });

			expect(serviceMock.getRanking).toHaveBeenCalledWith(
				"week",
				asMember.auth,
			);
		});

		it("maps PeriodNotAllowedError to 403 with PERIOD_NOT_ALLOWED", async () => {
			serviceMock.getRanking.mockRejectedValueOnce(new PeriodNotAllowedError());

			const error = await caller(asMember)
				.get({ period: "quarter" })
				.catch((err: unknown) => err);

			expect(error).toBeInstanceOf(ORPCError);
			expect((error as ORPCError<string, unknown>).code).toBe("FORBIDDEN");
			expect((error as ORPCError<string, { code: string }>).data.code).toBe(
				"PERIOD_NOT_ALLOWED",
			);
		});

		it("lets an admin through on quarter", async () => {
			await expect(
				caller(asAdmin).get({ period: "quarter" }),
			).resolves.toMatchObject({ period: "week" });

			expect(serviceMock.getRanking).toHaveBeenCalledWith(
				"quarter",
				asAdmin.auth,
			);
		});
	});

	describe("input", () => {
		it("defaults to period=all", async () => {
			await caller(asAdmin).get({});

			expect(serviceMock.getRanking).toHaveBeenCalledWith("all", asAdmin.auth);
		});

		it("treats a cleared period as absent", async () => {
			await caller(asAdmin).get({ period: "" as never });

			expect(serviceMock.getRanking).toHaveBeenCalledWith("all", asAdmin.auth);
		});

		it("rejects a period outside the enum before the service", async () => {
			await expect(
				caller(asAdmin).get({ period: "year" as never }),
			).rejects.toThrow();
			expect(serviceMock.getRanking).not.toHaveBeenCalled();
		});
	});
});
