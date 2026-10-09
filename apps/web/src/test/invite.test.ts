import { ORPCError } from "@orpc/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSession } from "@/lib/auth";
import { acceptInvite, InvalidInviteError, validateInvite } from "@/lib/invite";

const { clientMock } = vi.hoisted(() => ({
	clientMock: {
		auth: {
			validateInvite: vi.fn(),
			register: vi.fn(),
		},
	},
}));

vi.mock("@/utils/orpc", () => ({ client: clientMock }));

const TOKEN = "invite-token";
const INVITED_EMAIL = "novo.membro@kpicorp.com";

const REGISTER_RESPONSE = {
	accessToken: "access-1",
	refreshToken: "refresh-1",
	user: {
		id: "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf",
		name: "Novo Membro",
		email: INVITED_EMAIL,
		role: "MEMBER" as const,
		position: "Front-end Jr.",
	},
};

const dados = {
	token: TOKEN,
	name: "  Novo Membro ",
	position: " Front-end Jr. ",
	password: "kpicorp123",
};

function domainError(status: "UNAUTHORIZED" | "CONFLICT", code: string) {
	return new ORPCError(status, { data: { code } });
}

beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks();
});

describe("validateInvite", () => {
	it("consulta a API sem consumir o convite", async () => {
		clientMock.auth.validateInvite.mockResolvedValueOnce({
			status: "VALID",
			email: INVITED_EMAIL,
		});

		expect(await validateInvite(TOKEN)).toEqual({
			status: "VALID",
			email: INVITED_EMAIL,
		});
		expect(clientMock.auth.validateInvite).toHaveBeenCalledWith({
			token: TOKEN,
		});
		expect(clientMock.auth.register).not.toHaveBeenCalled();
	});
});

describe("acceptInvite", () => {
	it("cadastra pela API e abre a sessao devolvida", async () => {
		clientMock.auth.register.mockResolvedValueOnce(REGISTER_RESPONSE);

		const session = await acceptInvite(dados);

		expect(session.role).toBe("MEMBER");
		expect(session.email).toBe(INVITED_EMAIL);
		expect(getSession()?.userId).toBe(REGISTER_RESPONSE.user.id);
	});

	it("manda nome e cargo aparados e nunca manda perfil nem e-mail", async () => {
		clientMock.auth.register.mockResolvedValueOnce(REGISTER_RESPONSE);

		await acceptInvite(dados);

		expect(clientMock.auth.register).toHaveBeenCalledWith({
			token: TOKEN,
			name: "Novo Membro",
			position: "Front-end Jr.",
			password: "kpicorp123",
		});
	});

	it.each([
		["INVALID_INVITATION", "UNAUTHORIZED", "INVALID"],
		["INVITATION_EXPIRED", "UNAUTHORIZED", "EXPIRED"],
		["INVITATION_ALREADY_USED", "CONFLICT", "USED"],
		["EMAIL_ALREADY_REGISTERED", "CONFLICT", "USED"],
	] as const)("traduz %s para o motivo %s", async (code, status, motivo) => {
		clientMock.auth.register.mockRejectedValueOnce(domainError(status, code));

		const error = await acceptInvite(dados).catch((err: unknown) => err);

		expect(error).toBeInstanceOf(InvalidInviteError);
		expect((error as InvalidInviteError).status).toBe(motivo);
	});

	it("repassa erro que nao e do convite", async () => {
		const offline = new TypeError("offline");
		clientMock.auth.register.mockRejectedValueOnce(offline);

		await expect(acceptInvite(dados)).rejects.toBe(offline);
	});

	it("nao deixa sessao para tras quando recusa", async () => {
		clientMock.auth.register.mockRejectedValueOnce(
			domainError("UNAUTHORIZED", "INVITATION_EXPIRED"),
		);

		await acceptInvite(dados).catch(() => null);

		expect(getSession()).toBeNull();
	});
});
