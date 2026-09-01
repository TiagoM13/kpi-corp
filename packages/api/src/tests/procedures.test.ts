import { createProcedureClient, ORPCError } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import { adminProcedure, protectedProcedure, publicProcedure } from "../index";
import type { Context } from "../shared/context";

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

const echoContext = ({ context }: { context: Context }) => context;

const publicRoute = publicProcedure.handler(echoContext);
const protectedRoute = protectedProcedure.handler(echoContext);
const adminRoute = adminProcedure.handler(echoContext);

async function codeOf(call: Promise<unknown>) {
	const error = await call.catch((err: unknown) => err);

	expect(error).toBeInstanceOf(ORPCError);

	return (error as ORPCError<string, unknown>).code;
}

describe("publicProcedure", () => {
	it.each([
		["anonymous", anonymous],
		["member", asMember],
		["admin", asAdmin],
	])("should let %s through", async (_label, context) => {
		await expect(
			createProcedureClient(publicRoute, { context })(),
		).resolves.toBeDefined();
	});
});

describe("protectedProcedure", () => {
	it("should reject an anonymous request with UNAUTHORIZED", async () => {
		expect(
			await codeOf(
				createProcedureClient(protectedRoute, { context: anonymous })(),
			),
		).toBe("UNAUTHORIZED");
	});

	it("should let a member through", async () => {
		await expect(
			createProcedureClient(protectedRoute, { context: asMember })(),
		).resolves.toBeDefined();
	});

	it("should let an admin through", async () => {
		await expect(
			createProcedureClient(protectedRoute, { context: asAdmin })(),
		).resolves.toBeDefined();
	});

	it("should narrow context.auth so the handler can read it", async () => {
		const seen = vi.fn(({ context }: { context: Context }) => context.auth);
		const route = protectedProcedure.handler(seen);

		await createProcedureClient(route, { context: asMember })();

		expect(seen).toHaveBeenCalledTimes(1);
		expect(seen.mock.results[0]?.value).toEqual(asMember.auth);
	});

	it("should not run the handler when unauthenticated", async () => {
		const handler = vi.fn(() => "ok");
		const route = protectedProcedure.handler(handler);

		await createProcedureClient(route, { context: anonymous })().catch(
			() => {},
		);

		expect(handler).not.toHaveBeenCalled();
	});
});

describe("adminProcedure", () => {
	it("should reject an anonymous request with UNAUTHORIZED", async () => {
		expect(
			await codeOf(createProcedureClient(adminRoute, { context: anonymous })()),
		).toBe("UNAUTHORIZED");
	});

	it("should reject a member with FORBIDDEN", async () => {
		expect(
			await codeOf(createProcedureClient(adminRoute, { context: asMember })()),
		).toBe("FORBIDDEN");
	});

	it("should let an admin through", async () => {
		await expect(
			createProcedureClient(adminRoute, { context: asAdmin })(),
		).resolves.toBeDefined();
	});

	it("should not run the handler for a member", async () => {
		const handler = vi.fn(() => "ok");
		const route = adminProcedure.handler(handler);

		await createProcedureClient(route, { context: asMember })().catch(() => {});

		expect(handler).not.toHaveBeenCalled();
	});

	it("should distinguish unauthenticated from unauthorized", async () => {
		const anonymousCode = await codeOf(
			createProcedureClient(adminRoute, { context: anonymous })(),
		);
		const memberCode = await codeOf(
			createProcedureClient(adminRoute, { context: asMember })(),
		);

		expect(anonymousCode).toBe("UNAUTHORIZED");
		expect(memberCode).toBe("FORBIDDEN");
		expect(anonymousCode).not.toBe(memberCode);
	});
});
