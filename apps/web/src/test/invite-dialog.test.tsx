import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
	InviteDialog,
	inviteFormSchema,
	splitEmails,
} from "@/pages/admin/members/components/invite-dialog";

describe("splitEmails", () => {
	it.each([
		["a@b.com, c@d.com", 2],
		["a@b.com\nc@d.com\n", 2],
		["a@b.com; c@d.com;e@f.com", 3],
		["  a@b.com  ", 1],
	])("quebra %j em %i e-mails", (input, total) => {
		expect(splitEmails(input.trim())).toHaveLength(total);
	});
});

describe("inviteFormSchema", () => {
	it("aceita lista de e-mails validos", () => {
		const result = inviteFormSchema.safeParse({
			emails: "a@b.com, c@d.com",
			message: "vem",
		});

		expect(result.success).toBe(true);
	});

	it("recusa lista vazia", () => {
		expect(inviteFormSchema.safeParse({ emails: "   " }).success).toBe(false);
	});

	it("recusa a lista inteira quando um e-mail e invalido", () => {
		expect(
			inviteFormSchema.safeParse({ emails: "a@b.com, nao-e-email" }).success,
		).toBe(false);
	});

	it("recusa mensagem acima de 500 caracteres", () => {
		expect(
			inviteFormSchema.safeParse({
				emails: "a@b.com",
				message: "x".repeat(501),
			}).success,
		).toBe(false);
	});
});

describe("InviteDialog", () => {
	it("avisa o prazo real do convite, nao os 7 dias do mockup", () => {
		render(<InviteDialog open onOpenChange={() => {}} />);

		expect(screen.getByText("Convite expira em 48h")).toBeInTheDocument();
	});
});
