import { beforeEach, describe, expect, it, vi } from "vitest";

import { createContext } from "../../shared/context";
import { signAccessToken } from "../../shared/security/access-token";

const { repositoryMock } = vi.hoisted(() => ({
	repositoryMock: {
		findUserStatus: vi.fn(),
	},
}));

vi.mock("../../shared/security/session.repository", () => ({
	sessionRepository: repositoryMock,
}));

const USER_ID = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";

async function bearer(role: "ADMIN" | "MEMBER" = "MEMBER") {
	const token = await signAccessToken({
		id: USER_ID,
		email: "ana@kpicorp.com",
		role,
	});

	return { authorization: `Bearer ${token}` };
}

describe("createContext", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sem token não consulta o banco", async () => {
		const context = await createContext({});

		expect(context.auth).toBeNull();
		expect(repositoryMock.findUserStatus).not.toHaveBeenCalled();
	});

	it("usuário ativo recebe auth", async () => {
		repositoryMock.findUserStatus.mockResolvedValueOnce({
			active: true,
			role: "MEMBER",
		});

		const context = await createContext(await bearer());

		expect(context.auth).toEqual({
			userId: USER_ID,
			email: "ana@kpicorp.com",
			role: "MEMBER",
		});
	});

	it("usuário desativado com token ainda válido perde a sessão", async () => {
		repositoryMock.findUserStatus.mockResolvedValueOnce({
			active: false,
			role: "MEMBER",
		});

		const context = await createContext(await bearer());

		expect(context.auth).toBeNull();
	});

	it("usuário que não existe mais perde a sessão", async () => {
		repositoryMock.findUserStatus.mockResolvedValueOnce(null);

		const context = await createContext(await bearer());

		expect(context.auth).toBeNull();
	});

	it("o role vem do banco, não do token", async () => {
		repositoryMock.findUserStatus.mockResolvedValueOnce({
			active: true,
			role: "MEMBER",
		});

		const context = await createContext(await bearer("ADMIN"));

		expect(context.auth?.role).toBe("MEMBER");
	});
});
