import { beforeEach, describe, expect, it } from "vitest";

import {
	getSession,
	homeRouteFor,
	InvalidCredentialsError,
	signIn,
	signOut,
} from "@/lib/auth";
import { MOCK_PASSWORD } from "@/mocks/users";

const ADMIN = "ana.souza@kpicorp.io";
const MEMBER = "bruno.c@kpicorp.io";

const SESSAO_VALIDA = {
	userId: "u1",
	name: "Ana Beatriz Souza",
	email: ADMIN,
	position: "Tech Lead",
	role: "ADMIN",
	hue: 14,
};

beforeEach(() => {
	localStorage.clear();
});

describe("signIn", () => {
	it("autentica e devolve o perfil vindo do cadastro", () => {
		expect(signIn(ADMIN, MOCK_PASSWORD).role).toBe("ADMIN");
		expect(signIn(MEMBER, MOCK_PASSWORD).role).toBe("MEMBER");
	});

	it("aceita e-mail com espaco e caixa diferente", () => {
		expect(signIn("  ANA.SOUZA@KPICORP.IO ", MOCK_PASSWORD).userId).toBe("u1");
	});

	it("recusa senha errada", () => {
		expect(() => signIn(ADMIN, "errada")).toThrow(InvalidCredentialsError);
	});

	it("recusa e-mail inexistente com a mesma mensagem da senha errada", () => {
		const desconhecido = (() => {
			try {
				signIn("ninguem@kpicorp.io", MOCK_PASSWORD);
			} catch (error) {
				return (error as Error).message;
			}
		})();
		const senhaErrada = (() => {
			try {
				signIn(ADMIN, "errada");
			} catch (error) {
				return (error as Error).message;
			}
		})();

		// Mensagens iguais: nao revela quais e-mails existem.
		expect(desconhecido).toBe(senhaErrada);
	});

	it("nao deixa sessao para tras quando falha", () => {
		expect(() => signIn(ADMIN, "errada")).toThrow();
		expect(getSession()).toBeNull();
	});
});

describe("sessao", () => {
	it("persiste e some no signOut", () => {
		signIn(MEMBER, MOCK_PASSWORD);
		expect(getSession()?.email).toBe(MEMBER);

		signOut();
		expect(getSession()).toBeNull();
	});

	it("devolve null quando o storage esta corrompido", () => {
		localStorage.setItem("kpicorp.mock-session", "{ nao é json");
		expect(getSession()).toBeNull();
	});

	it.each([
		["objeto vazio", "{}"],
		["array", "[]"],
		["string", '"ana"'],
		["numero", "42"],
		["perfil desconhecido", JSON.stringify({ ...SESSAO_VALIDA, role: "ROOT" })],
		["sem nome", JSON.stringify({ ...SESSAO_VALIDA, name: undefined })],
		["hue como texto", JSON.stringify({ ...SESSAO_VALIDA, hue: "14" })],
	])("devolve null quando o storage tem %s", (_caso, payload) => {
		localStorage.setItem("kpicorp.mock-session", payload);
		expect(getSession()).toBeNull();
	});
});

describe("homeRouteFor", () => {
	it("manda admin para a area /admin e membro para as rotas normais", () => {
		expect(homeRouteFor("ADMIN")).toBe("/admin");
		expect(homeRouteFor("MEMBER")).toBe("/dashboard");
	});
});
