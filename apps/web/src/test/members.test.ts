import { beforeEach, describe, expect, it, vi } from "vitest";

import { categorySharesOf, inviteMembers, memberStatusOf } from "@/lib/members";

const { clientMock } = vi.hoisted(() => ({
	clientMock: { members: { invite: vi.fn() } },
}));

vi.mock("@/utils/orpc", () => ({ client: clientMock }));

const NOW = new Date("2026-09-25T12:00:00.000Z");

beforeEach(() => {
	vi.clearAllMocks();
});

describe("memberStatusOf", () => {
	it("inativo vence qualquer contagem de dias", () => {
		expect(
			memberStatusOf({ active: false, stagnant: false, daysWithoutKpi: 90 }),
		).toStrictEqual({ kind: "INACTIVE" });
	});

	it("marca parado quando a API diz que passou do limite, com os dias que ela mandou", () => {
		expect(
			memberStatusOf({ active: true, stagnant: true, daysWithoutKpi: 30 }),
		).toStrictEqual({ kind: "STAGNANT", days: 30 });
	});

	it("não recalcula o limite: abaixo dele a API manda stagnant false", () => {
		expect(
			memberStatusOf({ active: true, stagnant: false, daysWithoutKpi: 29 }),
		).toStrictEqual({ kind: "ACTIVE" });
	});
});

describe("categorySharesOf", () => {
	it("distribui o percentual entre as quatro categorias", () => {
		const shares = categorySharesOf({
			presence: 25,
			performance: 25,
			behavior: 50,
			initiative: 0,
		});

		expect(
			shares.map(({ category, percent }) => [category.id, percent]),
		).toStrictEqual([
			["presenca", 25],
			["desempenho", 25],
			["comportamento", 50],
			["iniciativa", 0],
		]);
	});

	it("nao deixa saldo negativo virar barra negativa", () => {
		const shares = categorySharesOf({
			presence: -10,
			performance: 10,
			behavior: 0,
			initiative: 0,
		});

		expect(shares[0]).toMatchObject({ points: 0, percent: 0 });
		expect(shares[1]).toMatchObject({ points: 10, percent: 100 });
	});
});

describe("inviteMembers", () => {
	it("separa quem ja tem conta das outras falhas", async () => {
		clientMock.members.invite.mockResolvedValueOnce({
			created: [
				{
					id: "i1",
					email: "novo@b.com",
					token: "t",
					inviteUrl: "http://localhost:3001/invite/t",
					expiresAt: NOW,
				},
			],
			failed: [
				{ email: "ana@b.com", code: "EMAIL_ALREADY_REGISTERED" },
				{ email: "x@b.com", code: "INTERNAL" },
			],
		});

		expect(
			await inviteMembers(["novo@b.com", "ana@b.com", "x@b.com"]),
		).toStrictEqual({
			created: ["novo@b.com"],
			alreadyRegistered: ["ana@b.com"],
			failed: ["x@b.com"],
		});
	});
});
