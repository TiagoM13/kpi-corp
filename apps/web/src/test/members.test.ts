import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	categorySharesOf,
	daysWithoutKpi,
	inviteMembers,
	memberStatusOf,
} from "@/lib/members";

const { clientMock } = vi.hoisted(() => ({
	clientMock: { members: { invite: vi.fn() } },
}));

vi.mock("@/utils/orpc", () => ({ client: clientMock }));

const NOW = new Date("2026-09-25T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number) {
	return new Date(NOW.getTime() - days * DAY_MS);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("daysWithoutKpi", () => {
	it("conta a partir do ultimo KPI", () => {
		expect(
			daysWithoutKpi(
				{ lastAssignmentAt: daysAgo(3), createdAt: daysAgo(100) },
				NOW,
			),
		).toBe(3);
	});

	it("conta a partir da entrada quando nunca recebeu KPI", () => {
		expect(
			daysWithoutKpi({ lastAssignmentAt: null, createdAt: daysAgo(12) }, NOW),
		).toBe(12);
	});
});

describe("memberStatusOf", () => {
	it("inativo vence qualquer contagem de dias", () => {
		expect(
			memberStatusOf(
				{ active: false, lastAssignmentAt: null, createdAt: daysAgo(90) },
				NOW,
			),
		).toStrictEqual({ kind: "INACTIVE" });
	});

	it("marca parado a partir de 30 dias, a mesma regra do dashboard", () => {
		expect(
			memberStatusOf(
				{ active: true, lastAssignmentAt: daysAgo(29), createdAt: daysAgo(90) },
				NOW,
			),
		).toStrictEqual({ kind: "ACTIVE" });
		expect(
			memberStatusOf(
				{ active: true, lastAssignmentAt: daysAgo(30), createdAt: daysAgo(90) },
				NOW,
			),
		).toStrictEqual({ kind: "STAGNANT", days: 30 });
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
