import { Prisma } from "@kpi-corp/db/prisma/generated/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { KpiNameTakenError } from "../../../modules/kpis/kpis.errors";
import { kpisService } from "../../../modules/kpis/kpis.service";
import { KpiNotFoundError } from "../../../shared/errors/common.errors";

const { repositoryMock } = vi.hoisted(() => ({
	repositoryMock: {
		create: vi.fn(),
		list: vi.fn(),
		findById: vi.fn(),
		update: vi.fn(),
		setStatus: vi.fn(),
	},
}));

vi.mock("../../../modules/kpis/kpis.repository", () => ({
	kpisRepository: repositoryMock,
}));

const KPI_ID = "3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8";

const kpi = {
	id: KPI_ID,
	name: "Presença na reunião",
	description: null,
	points: 5,
	category: "PRESENCE" as const,
	active: true,
	createdAt: new Date(),
};

function prismaError(code: string) {
	return new Prisma.PrismaClientKnownRequestError("boom", {
		code,
		clientVersion: "7.9.1",
	});
}

describe("kpis service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("create", () => {
		it("should create a kpi", async () => {
			repositoryMock.create.mockResolvedValueOnce(kpi);

			expect(
				await kpisService.create({
					name: "Presença na reunião",
					points: 5,
					category: "PRESENCE",
				}),
			).toMatchObject({ id: KPI_ID, points: 5 });
		});

		it("should store a null description when it is omitted", async () => {
			repositoryMock.create.mockResolvedValueOnce(kpi);

			await kpisService.create({
				name: "Presença na reunião",
				points: 5,
				category: "PRESENCE",
			});

			expect(repositoryMock.create).toHaveBeenCalledWith(
				expect.objectContaining({ description: null }),
			);
		});

		it("should translate the unique constraint into KpiNameTakenError", async () => {
			repositoryMock.create.mockRejectedValueOnce(prismaError("P2002"));

			await expect(
				kpisService.create({
					name: "Presença na reunião",
					points: 5,
					category: "PRESENCE",
				}),
			).rejects.toThrow(KpiNameTakenError);
		});

		it("should not swallow an unrelated database error", async () => {
			repositoryMock.create.mockRejectedValueOnce(new Error("connection lost"));

			await expect(
				kpisService.create({
					name: "Presença na reunião",
					points: 5,
					category: "PRESENCE",
				}),
			).rejects.toThrow("connection lost");
		});
	});

	describe("list", () => {
		it("should return the items with a total", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [kpi], total: 1 });

			expect(await kpisService.list({})).toEqual({
				items: [expect.objectContaining({ id: KPI_ID })],
				total: 1,
			});
		});

		it("should forward the filter untouched", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [], total: 0 });

			await kpisService.list({
				category: "BEHAVIOR",
				active: false,
				search: "atraso",
			});

			expect(repositoryMock.list).toHaveBeenCalledWith({
				category: "BEHAVIOR",
				active: false,
				search: "atraso",
			});
		});
	});

	describe("getById", () => {
		it("should return the kpi", async () => {
			repositoryMock.findById.mockResolvedValueOnce(kpi);

			expect(await kpisService.getById(KPI_ID)).toMatchObject({ id: KPI_ID });
		});

		it("should throw KpiNotFoundError for an unknown id", async () => {
			repositoryMock.findById.mockResolvedValueOnce(null);

			await expect(kpisService.getById(KPI_ID)).rejects.toThrow(
				KpiNotFoundError,
			);
		});
	});

	describe("update", () => {
		it("should replace every writable field", async () => {
			repositoryMock.update.mockResolvedValueOnce({ ...kpi, points: 60 });

			await kpisService.update({
				id: KPI_ID,
				name: "Excelente apresentação",
				description: "Reconhecimento",
				points: 60,
				category: "PERFORMANCE",
			});

			expect(repositoryMock.update).toHaveBeenCalledWith(KPI_ID, {
				name: "Excelente apresentação",
				description: "Reconhecimento",
				points: 60,
				category: "PERFORMANCE",
			});
		});

		it("should clear the description when it is omitted", async () => {
			repositoryMock.update.mockResolvedValueOnce(kpi);

			await kpisService.update({
				id: KPI_ID,
				name: "Presença na reunião",
				points: 5,
				category: "PRESENCE",
			});

			expect(repositoryMock.update).toHaveBeenCalledWith(
				KPI_ID,
				expect.objectContaining({ description: null }),
			);
		});

		it("should translate the unique constraint into KpiNameTakenError", async () => {
			repositoryMock.update.mockRejectedValueOnce(prismaError("P2002"));

			await expect(
				kpisService.update({
					id: KPI_ID,
					name: "Duplicado",
					points: 5,
					category: "PRESENCE",
				}),
			).rejects.toThrow(KpiNameTakenError);
		});

		it("should translate a missing record into KpiNotFoundError", async () => {
			repositoryMock.update.mockRejectedValueOnce(prismaError("P2025"));

			await expect(
				kpisService.update({
					id: KPI_ID,
					name: "Sumiu",
					points: 5,
					category: "PRESENCE",
				}),
			).rejects.toThrow(KpiNotFoundError);
		});
	});

	describe("setStatus", () => {
		it("should deactivate and reactivate", async () => {
			repositoryMock.setStatus.mockResolvedValueOnce({ ...kpi, active: false });
			expect((await kpisService.setStatus(KPI_ID, false)).active).toBe(false);

			repositoryMock.setStatus.mockResolvedValueOnce({ ...kpi, active: true });
			expect((await kpisService.setStatus(KPI_ID, true)).active).toBe(true);
		});

		it("should translate a missing record into KpiNotFoundError", async () => {
			repositoryMock.setStatus.mockRejectedValueOnce(prismaError("P2025"));

			await expect(kpisService.setStatus(KPI_ID, false)).rejects.toThrow(
				KpiNotFoundError,
			);
		});
	});
});
