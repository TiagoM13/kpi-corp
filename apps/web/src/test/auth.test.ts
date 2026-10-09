import { ORPCError } from "@orpc/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	AccountDeactivatedError,
	getSession,
	homeRouteFor,
	InvalidCredentialsError,
	signIn,
	signOut,
	syncSessionUser,
} from "@/lib/auth";
import { onSessionCleared, readStoredSession } from "@/lib/session-store";

const { clientMock } = vi.hoisted(() => ({
	clientMock: {
		auth: {
			login: vi.fn(),
			logout: vi.fn(),
		},
	},
}));

vi.mock("@/utils/orpc", () => ({ client: clientMock }));

const STORAGE_KEY = "kpicorp.session";

const ADMIN = {
	id: "b29f5637-0ab1-4de0-b2d2-d364e3903124",
	name: "Admin",
	email: "admin@kpicorp.com",
	role: "ADMIN" as const,
	position: null,
};

const LOGIN_RESPONSE = {
	accessToken: "access-1",
	refreshToken: "refresh-1",
	user: ADMIN,
};

const SESSAO_VALIDA = {
	accessToken: "access-1",
	refreshToken: "refresh-1",
	user: {
		userId: ADMIN.id,
		name: ADMIN.name,
		email: ADMIN.email,
		role: ADMIN.role,
		position: null,
	},
};

function domainError(status: "UNAUTHORIZED" | "FORBIDDEN", code: string) {
	return new ORPCError(status, { data: { code } });
}

async function messageOf(run: () => Promise<unknown>) {
	const error = await run().catch((err: unknown) => err);
	return (error as Error).message;
}

beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks();
});

describe("signIn", () => {
	it("grava tokens e devolve o perfil vindo do servidor", async () => {
		clientMock.auth.login.mockResolvedValueOnce(LOGIN_RESPONSE);

		const session = await signIn(ADMIN.email, "admin123");

		expect(session).toEqual(SESSAO_VALIDA.user);
		expect(readStoredSession()).toEqual(SESSAO_VALIDA);
	});

	it("traduz INVALID_CREDENTIALS para erro de credencial", async () => {
		clientMock.auth.login.mockRejectedValueOnce(
			domainError("UNAUTHORIZED", "INVALID_CREDENTIALS"),
		);

		await expect(signIn(ADMIN.email, "errada")).rejects.toBeInstanceOf(
			InvalidCredentialsError,
		);
	});

	it("usa a mesma mensagem para e-mail inexistente e senha errada", async () => {
		clientMock.auth.login.mockRejectedValue(
			domainError("UNAUTHORIZED", "INVALID_CREDENTIALS"),
		);

		const desconhecido = await messageOf(() =>
			signIn("ninguem@kpicorp.com", "admin123"),
		);
		const senhaErrada = await messageOf(() => signIn(ADMIN.email, "errada"));

		expect(desconhecido).toBe(senhaErrada);
	});

	it("separa conta desativada de credencial invalida", async () => {
		clientMock.auth.login.mockRejectedValueOnce(
			domainError("FORBIDDEN", "ACCOUNT_DEACTIVATED"),
		);

		const error = await signIn(ADMIN.email, "admin123").catch(
			(err: unknown) => err,
		);

		expect(error).toBeInstanceOf(AccountDeactivatedError);
		expect((error as Error).message).not.toBe(
			new InvalidCredentialsError().message,
		);
	});

	it("ramifica pelo data.code, nunca pela mensagem", async () => {
		clientMock.auth.login.mockRejectedValueOnce(
			new ORPCError("UNAUTHORIZED", {
				message: "Invalid email or password",
			}),
		);

		await expect(signIn(ADMIN.email, "errada")).rejects.not.toBeInstanceOf(
			InvalidCredentialsError,
		);
	});

	it("nao deixa sessao para tras quando falha", async () => {
		clientMock.auth.login.mockRejectedValueOnce(
			domainError("UNAUTHORIZED", "INVALID_CREDENTIALS"),
		);

		await signIn(ADMIN.email, "errada").catch(() => null);

		expect(getSession()).toBeNull();
	});
});

describe("signOut", () => {
	it("revoga o refresh token no servidor e limpa o local", async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(SESSAO_VALIDA));
		clientMock.auth.logout.mockResolvedValueOnce({ success: true });

		await signOut();

		expect(clientMock.auth.logout).toHaveBeenCalledWith({
			refreshToken: "refresh-1",
		});
		expect(getSession()).toBeNull();
	});

	it("limpa o local mesmo quando a API falha", async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(SESSAO_VALIDA));
		clientMock.auth.logout.mockRejectedValueOnce(new TypeError("offline"));

		await signOut();

		expect(getSession()).toBeNull();
	});

	it("avisa quem ouve o fim da sessao", async () => {
		const listener = vi.fn();
		const unsubscribe = onSessionCleared(listener);
		clientMock.auth.logout.mockResolvedValueOnce({ success: true });

		await signOut();
		unsubscribe();

		expect(listener).toHaveBeenCalledTimes(1);
	});
});

describe("getSession", () => {
	it("le o snapshot de forma sincrona", () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(SESSAO_VALIDA));

		expect(getSession()).toEqual(SESSAO_VALIDA.user);
	});

	it("devolve null quando o storage esta corrompido", () => {
		localStorage.setItem(STORAGE_KEY, "{ nao é json");
		expect(getSession()).toBeNull();
	});

	it("devolve null quando o localStorage esta indisponivel", () => {
		const getItem = vi
			.spyOn(Storage.prototype, "getItem")
			.mockImplementation(() => {
				throw new Error("SecurityError");
			});

		expect(getSession()).toBeNull();
		getItem.mockRestore();
	});

	it("nao aceita a sessao mock antiga", () => {
		localStorage.setItem(
			"kpicorp.mock-session",
			JSON.stringify({ ...SESSAO_VALIDA.user, hue: 14 }),
		);

		expect(getSession()).toBeNull();
	});

	it.each([
		["objeto vazio", "{}"],
		["array", "[]"],
		["string", '"ana"'],
		["sem access token", JSON.stringify({ ...SESSAO_VALIDA, accessToken: "" })],
		[
			"sem refresh token",
			JSON.stringify({ ...SESSAO_VALIDA, refreshToken: undefined }),
		],
		[
			"perfil desconhecido",
			JSON.stringify({
				...SESSAO_VALIDA,
				user: { ...SESSAO_VALIDA.user, role: "ROOT" },
			}),
		],
		[
			"cargo como numero",
			JSON.stringify({
				...SESSAO_VALIDA,
				user: { ...SESSAO_VALIDA.user, position: 42 },
			}),
		],
	])("devolve null quando o storage tem %s", (_caso, payload) => {
		localStorage.setItem(STORAGE_KEY, payload);
		expect(getSession()).toBeNull();
	});
});

describe("syncSessionUser", () => {
	it("atualiza o perfil sem tocar nos tokens", () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(SESSAO_VALIDA));

		syncSessionUser({ ...ADMIN, role: "MEMBER", position: "QA" });

		expect(readStoredSession()).toEqual({
			...SESSAO_VALIDA,
			user: { ...SESSAO_VALIDA.user, role: "MEMBER", position: "QA" },
		});
	});

	it("nao recria sessao que ja saiu", () => {
		expect(syncSessionUser(ADMIN)).toBeNull();
		expect(getSession()).toBeNull();
	});
});

describe("homeRouteFor", () => {
	it("manda admin para a area /admin e membro para as rotas normais", () => {
		expect(homeRouteFor("ADMIN")).toBe("/admin");
		expect(homeRouteFor("MEMBER")).toBe("/dashboard");
	});
});
