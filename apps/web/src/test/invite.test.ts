import { beforeEach, describe, expect, it } from "vitest";

import { getSession } from "@/lib/auth";
import { acceptInvite, InvalidInviteError, validateInvite } from "@/lib/invite";
import {
	EXPIRED_TOKEN,
	INVITED_EMAIL,
	USED_TOKEN,
	VALID_TOKEN,
} from "@/mocks/invites";

beforeEach(() => {
	localStorage.clear();
});

describe("validateInvite", () => {
	it("devolve o e-mail do convite quando o token vale", () => {
		expect(validateInvite(VALID_TOKEN)).toEqual({
			status: "VALID",
			email: INVITED_EMAIL,
		});
	});

	it("marca como expirado o token fora do prazo", () => {
		expect(validateInvite(EXPIRED_TOKEN)).toEqual({ status: "EXPIRED" });
	});

	it("marca como usado o token de convite ja aceito", () => {
		expect(validateInvite(USED_TOKEN)).toEqual({ status: "USED" });
	});

	it("marca como invalido um token desconhecido", () => {
		expect(validateInvite("nao-existe")).toEqual({ status: "INVALID" });
	});

	it("nao revela e-mail em nenhum estado de recusa", () => {
		for (const token of [EXPIRED_TOKEN, USED_TOKEN, "nao-existe"]) {
			expect(validateInvite(token)).not.toHaveProperty("email");
		}
	});
});

describe("acceptInvite", () => {
	const dados = {
		name: "Novo Membro",
		position: "Front-end Jr.",
		password: "kpicorp123",
	};

	it("cria sessao de MEMBER com o e-mail do convite", () => {
		const session = acceptInvite({ token: VALID_TOKEN, ...dados });

		expect(session.role).toBe("MEMBER");
		expect(session.email).toBe(INVITED_EMAIL);
		expect(session.name).toBe(dados.name);
		expect(session.position).toBe(dados.position);
	});

	it("deixa a sessao recuperavel por getSession", () => {
		acceptInvite({ token: VALID_TOKEN, ...dados });

		expect(getSession()?.email).toBe(INVITED_EMAIL);
	});

	it("queima o convite: o mesmo token nao vale duas vezes", () => {
		acceptInvite({ token: VALID_TOKEN, ...dados });

		expect(validateInvite(VALID_TOKEN)).toEqual({ status: "USED" });
		expect(() => acceptInvite({ token: VALID_TOKEN, ...dados })).toThrow(
			InvalidInviteError,
		);
	});

	it("recusa token expirado, usado e inexistente", () => {
		for (const token of [EXPIRED_TOKEN, USED_TOKEN, "nao-existe"]) {
			expect(() => acceptInvite({ token, ...dados })).toThrow(
				InvalidInviteError,
			);
		}
	});

	it("nao deixa sessao para tras quando recusa", () => {
		expect(() => acceptInvite({ token: EXPIRED_TOKEN, ...dados })).toThrow();

		expect(getSession()).toBeNull();
	});

	it("informa o motivo da recusa para a tela escolher a mensagem", () => {
		try {
			acceptInvite({ token: EXPIRED_TOKEN, ...dados });
			expect.unreachable("deveria ter recusado");
		} catch (error) {
			expect((error as InvalidInviteError).status).toBe("EXPIRED");
		}
	});
});
