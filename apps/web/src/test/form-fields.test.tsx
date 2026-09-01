import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InviteForm } from "@/pages/invite/components/invite-form";
import { LoginForm } from "@/pages/login/components/login-form";
import { renderWithRouter } from "./render-with-router";

/**
 * Trava o invariante, nao o texto: campo editavel sem placeholder deixa o
 * formulario com buracos visuais. Afirmar a copy exata quebraria o teste a
 * cada ajuste de redacao sem pegar bug nenhum.
 */
function editableInputs() {
	return [...document.querySelectorAll("input")].filter(
		(input) => !input.readOnly && input.type !== "hidden",
	);
}

describe("placeholder dos formularios", () => {
	it("login preenche todos os campos editaveis", async () => {
		await renderWithRouter(<LoginForm />);

		const inputs = editableInputs();
		expect(inputs).toHaveLength(2);

		for (const input of inputs) {
			expect(input.placeholder, `#${input.id} sem placeholder`).not.toBe("");
		}
	});

	it("convite preenche todos os campos editaveis", async () => {
		await renderWithRouter(
			<InviteForm token="convite-valido" email="novo.membro@kpicorp.io" />,
		);

		const inputs = editableInputs();
		expect(inputs).toHaveLength(4);

		for (const input of inputs) {
			expect(input.placeholder, `#${input.id} sem placeholder`).not.toBe("");
		}
	});

	it("o e-mail do convite continua travado no valor do link", async () => {
		await renderWithRouter(
			<InviteForm token="convite-valido" email="novo.membro@kpicorp.io" />,
		);

		const email = screen.getByLabelText("E-mail") as HTMLInputElement;
		expect(email.readOnly).toBe(true);
		expect(email.value).toBe("novo.membro@kpicorp.io");
	});
});
