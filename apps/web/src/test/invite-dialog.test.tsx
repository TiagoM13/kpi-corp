import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	InviteDialog,
	inviteFormSchema,
	splitEmails,
} from "@/pages/admin/members/components/invite-dialog";

const { clientMock, toastMock } = vi.hoisted(() => ({
	clientMock: { members: { invite: vi.fn() } },
	toastMock: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock("@/utils/orpc", () => ({ client: clientMock }));
vi.mock("sonner", () => ({ toast: toastMock }));

beforeEach(() => {
	vi.clearAllMocks();
});

function submitEmails(value: string) {
	fireEvent.change(screen.getByRole("textbox", { name: /e-mails/i }), {
		target: { value },
	});
	fireEvent.click(screen.getByRole("button", { name: "Enviar convites" }));
}

describe("splitEmails", () => {
	it.each([
		["a@b.com, c@d.com", 2],
		["a@b.com\nc@d.com\n", 2],
		["a@b.com; c@d.com;e@f.com", 3],
		["  a@b.com  ", 1],
	])("quebra %j em %i e-mails", (input, total) => {
		expect(splitEmails(input.trim())).toHaveLength(total);
	});

	it("junta e-mails repetidos", () => {
		expect(splitEmails("a@b.com, a@b.com")).toStrictEqual(["a@b.com"]);
	});
});

describe("inviteFormSchema", () => {
	it("aceita lista de e-mails validos", () => {
		const result = inviteFormSchema.safeParse({
			emails: "a@b.com, c@d.com",
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

	it("recusa mais convites do que a API aceita por vez", () => {
		const emails = Array.from({ length: 51 }, (_, index) => `m${index}@b.com`);

		expect(
			inviteFormSchema.safeParse({ emails: emails.join(",") }).success,
		).toBe(false);
	});
});

describe("InviteDialog", () => {
	it("avisa o prazo real do convite, nao os 7 dias do mockup", () => {
		render(<InviteDialog open onOpenChange={() => {}} />);

		expect(screen.getByText("Convite expira em 48h")).toBeInTheDocument();
	});

	it("tem o botao de fechar no cabecalho", () => {
		render(<InviteDialog open onOpenChange={() => {}} />);

		expect(
			screen.getByRole("button", { name: "Fechar convite" }),
		).toBeInTheDocument();
	});

	it("mantem cabecalho e acoes fora da area que rola", () => {
		render(<InviteDialog open onOpenChange={() => {}} />);

		const title = screen.getByText("Convidar membros");
		const dialog = title.closest("[data-slot=dialog-content]");
		const scroller = dialog?.querySelector(".overflow-y-auto");
		const submit = screen.getByRole("button", { name: "Enviar convites" });

		expect(scroller).not.toBeNull();
		expect(scroller?.contains(title)).toBe(false);
		expect(scroller?.contains(submit)).toBe(false);
		expect(scroller?.querySelector("textarea")).not.toBeNull();
	});

	it("cria os convites na API e fecha", async () => {
		clientMock.members.invite.mockResolvedValueOnce({
			created: [
				{
					id: "i1",
					email: "a@b.com",
					token: "t",
					inviteUrl: "http://localhost:3001/invite/t",
					expiresAt: new Date(),
				},
			],
			failed: [],
		});
		const onOpenChange = vi.fn();
		render(<InviteDialog open onOpenChange={onOpenChange} />);

		submitEmails("a@b.com, a@b.com");

		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
		expect(clientMock.members.invite).toHaveBeenCalledWith({
			emails: ["a@b.com"],
		});
		expect(toastMock.success).toHaveBeenCalledWith("Convite criado");
	});

	it("avisa quem ja tem conta", async () => {
		clientMock.members.invite.mockResolvedValueOnce({
			created: [],
			failed: [{ email: "ana@b.com", code: "EMAIL_ALREADY_REGISTERED" }],
		});
		render(<InviteDialog open onOpenChange={() => {}} />);

		submitEmails("ana@b.com");

		await waitFor(() =>
			expect(toastMock.warning).toHaveBeenCalledWith("Um e-mail já tem conta", {
				description: "ana@b.com",
			}),
		);
		expect(toastMock.success).not.toHaveBeenCalled();
	});

	it("mantem o dialog aberto quando a API falha", async () => {
		clientMock.members.invite.mockRejectedValueOnce(new Error("offline"));
		const onOpenChange = vi.fn();
		render(<InviteDialog open onOpenChange={onOpenChange} />);

		submitEmails("a@b.com");

		await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
		expect(onOpenChange).not.toHaveBeenCalled();
	});
});
