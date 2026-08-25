import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { INVITE_ERROR } from "@/lib/invite";
import { InviteError } from "@/pages/invite/components/invite-error";
import { inviteSchema } from "@/pages/invite/components/invite-form";

describe("InviteError", () => {
	it.each(["EXPIRED", "USED", "INVALID"] as const)(
		"explica o motivo %s em vez de mandar o convidado adivinhar",
		(status) => {
			render(<InviteError status={status} />);

			expect(screen.getByText(INVITE_ERROR[status].title)).toBeInTheDocument();
			expect(
				screen.getByText(INVITE_ERROR[status].description),
			).toBeInTheDocument();
		},
	);

	it("oferece caminho de volta para o login", () => {
		render(<InviteError status="EXPIRED" />);

		expect(screen.getByRole("link", { name: /login/i })).toHaveAttribute(
			"href",
			"/login",
		);
	});
});

describe("inviteSchema", () => {
	const cadastro = {
		name: "Novo Membro",
		position: "QA Jr.",
		password: "kpicorp123",
		passwordConfirmation: "kpicorp123",
	};

	it("aceita cadastro completo", () => {
		expect(inviteSchema.safeParse(cadastro).success).toBe(true);
	});

	it("recusa senha com menos de 8 caracteres", () => {
		const result = inviteSchema.safeParse({
			...cadastro,
			password: "curta1",
			passwordConfirmation: "curta1",
		});

		expect(result.success).toBe(false);
	});

	it("aponta a confirmacao divergente no proprio campo", () => {
		const result = inviteSchema.safeParse({
			...cadastro,
			passwordConfirmation: "outra-senha",
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(["passwordConfirmation"]);
	});

	it("exige nome e cargo", () => {
		expect(inviteSchema.safeParse({ ...cadastro, name: "   " }).success).toBe(
			false,
		);
		expect(inviteSchema.safeParse({ ...cadastro, position: "" }).success).toBe(
			false,
		);
	});
});
