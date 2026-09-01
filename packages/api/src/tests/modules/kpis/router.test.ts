import { createProcedureClient, ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { kpisRouter } from "../../../modules/kpis/kpis.router";
import type { Context } from "../../../shared/context";

const { serviceMock } = vi.hoisted(() => ({
	serviceMock: {
		create: vi.fn(),
		list: vi.fn(),
		getById: vi.fn(),
		update: vi.fn(),
		setStatus: vi.fn(),
	},
}));

vi.mock("../../../modules/kpis/kpis.service", () => ({
	kpisService: serviceMock,
}));

const KPI_ID = "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8";

const anonymous: Context = { headers: {}, auth: null };
const asMember: Context = {
	headers: {},
	auth: {
		userId: "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf",
		email: "ana@kpicorp.com",
		role: "MEMBER",
	},
};
const asAdmin: Context = {
	headers: {},
	auth: {
		userId: "b29f5637-0ab1-4de0-b2d2-d364e3903124",
		email: "admin@kpicorp.com",
		role: "ADMIN",
	},
};

const kpi = {
	id: KPI_ID,
	name: "Presença na reunião",
	description: null,
	points: 5,
	category: "PRESENCE" as const,
	active: true,
	createdAt: new Date(),
};

function caller(context: Context) {
	return {
		create: createProcedureClient(kpisRouter.create, { context }),
		list: createProcedureClient(kpisRouter.list, { context }),
		getById: createProcedureClient(kpisRouter.getById, { context }),
		update: createProcedureClient(kpisRouter.update, { context }),
		setStatus: createProcedureClient(kpisRouter.setStatus, { context }),
	};
}

async function codeOf(call: Promise<unknown>) {
	const error = await call.catch((err: unknown) => err);

	expect(error).toBeInstanceOf(ORPCError);

	return (error as ORPCError<string, unknown>).code;
}

const VALID = {
	create: { name: "Novo", points: 5, category: "PRESENCE" },
	list: {},
	getById: { id: KPI_ID },
	update: { id: KPI_ID, name: "Novo", points: 5, category: "PRESENCE" },
	setStatus: { id: KPI_ID, active: false },
} as const;

describe("kpis router", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("authorization", () => {
		const routes = [
			"create",
			"list",
			"getById",
			"update",
			"setStatus",
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
	});

	describe("create", () => {
		it("accepts a valid kpi", async () => {
			serviceMock.create.mockResolvedValueOnce(kpi);

			expect(await caller(asAdmin).create(VALID.create)).toMatchObject({
				id: KPI_ID,
			});
		});

		it.each([0, -1, 101])("rejects points = %i", async (points) => {
			await expect(
				caller(asAdmin).create({ ...VALID.create, points }),
			).rejects.toThrow();
			expect(serviceMock.create).not.toHaveBeenCalled();
		});

		it.each([1, 100])("accepts points = %i", async (points) => {
			serviceMock.create.mockResolvedValueOnce({ ...kpi, points });

			await caller(asAdmin).create({ ...VALID.create, points });

			expect(serviceMock.create).toHaveBeenCalled();
		});

		it("rejects a category outside the enum", async () => {
			await expect(
				caller(asAdmin).create({ ...VALID.create, category: "OUTRA" as never }),
			).rejects.toThrow();
		});

		it("rejects an empty name", async () => {
			await expect(
				caller(asAdmin).create({ ...VALID.create, name: "   " }),
			).rejects.toThrow();
		});
	});

	describe("list", () => {
		beforeEach(() => {
			serviceMock.list.mockResolvedValue({ items: [], total: 0 });
		});

		it("reads active=false as false, not true", async () => {
			// z.coerce.boolean() faria Boolean("false") === true e a listagem
			// devolveria exatamente o oposto do filtrado, em silencio.
			await caller(asAdmin).list({ active: "false" as never });

			expect(serviceMock.list).toHaveBeenCalledWith(
				expect.objectContaining({ active: false }),
			);
		});

		it("reads active=true as true", async () => {
			await caller(asAdmin).list({ active: "true" as never });

			expect(serviceMock.list).toHaveBeenCalledWith(
				expect.objectContaining({ active: true }),
			);
		});

		it("treats cleared filters as absent", async () => {
			await caller(asAdmin).list({
				category: "" as never,
				active: "" as never,
				search: "" as never,
			});

			expect(serviceMock.list).toHaveBeenCalledWith({});
		});

		it("rejects a value that is neither true nor false", async () => {
			await expect(
				caller(asAdmin).list({ active: "sim" as never }),
			).rejects.toThrow();
		});
	});

	describe("getById", () => {
		it("rejects an id that is not a uuid", async () => {
			await expect(caller(asAdmin).getById({ id: "abc" })).rejects.toThrow();
			expect(serviceMock.getById).not.toHaveBeenCalled();
		});
	});

	describe("update", () => {
		it("passes the id together with the fields", async () => {
			serviceMock.update.mockResolvedValueOnce(kpi);

			await caller(asAdmin).update(VALID.update);

			expect(serviceMock.update).toHaveBeenCalledWith(VALID.update);
		});
	});

	describe("setStatus", () => {
		it("passes id and active through", async () => {
			serviceMock.setStatus.mockResolvedValueOnce({ ...kpi, active: false });

			await caller(asAdmin).setStatus(VALID.setStatus);

			expect(serviceMock.setStatus).toHaveBeenCalledWith(KPI_ID, false);
		});
	});
});
