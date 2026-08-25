import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { levelOf } from "@/lib/member-stats";
import { MOCK_MEMBERS } from "@/mocks/members";
import { AdminMembersPage } from "@/pages/admin/members";

function memberRows() {
	const table = screen.getByRole("table");
	return within(table).getAllByRole("row").slice(1);
}

function searchFor(term: string) {
	fireEvent.change(screen.getByRole("searchbox", { name: /buscar membro/i }), {
		target: { value: term },
	});
}

describe("AdminMembersPage", () => {
	it("lista todo mundo do time", async () => {
		render(<AdminMembersPage />);

		expect(memberRows()).toHaveLength(MOCK_MEMBERS.length);
		expect(
			screen.getByRole("heading", { name: `${MOCK_MEMBERS.length} membros` }),
		).toBeInTheDocument();
	});

	it("ordena do maior para o menor em pontos", () => {
		const points = MOCK_MEMBERS.map((member) => member.points);

		expect(points).toStrictEqual([...points].sort((a, b) => b - a));
	});

	it("filtra por nome", async () => {
		render(<AdminMembersPage />);

		searchFor("carla");
		await waitFor(() => expect(memberRows()).toHaveLength(1));

		const table = screen.getByRole("table");
		expect(within(table).getByText("Carla Menezes")).toBeInTheDocument();
		expect(within(table).queryByText("Bruno Carvalho")).not.toBeInTheDocument();
	});

	it("filtra por cargo", async () => {
		render(<AdminMembersPage />);

		searchFor("designer");
		await waitFor(() => expect(memberRows()).toHaveLength(2));

		const table = screen.getByRole("table");
		expect(within(table).getByText("Carla Menezes")).toBeInTheDocument();
		expect(within(table).getByText("Henrique Vieira")).toBeInTheDocument();
	});

	it("explica a lista vazia em vez de mostrar tabela sem linha", async () => {
		render(<AdminMembersPage />);

		searchFor("ninguem com esse nome");

		expect(await screen.findByText(/nenhum membro encontrado/i)).toBeVisible();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("abre o perfil do membro clicado", async () => {
		render(<AdminMembersPage />);

		const table = screen.getByRole("table");
		fireEvent.click(
			within(table).getByRole("button", {
				name: "Ver perfil de Ana Beatriz Souza",
			}),
		);

		expect(await screen.findByText("Perfil do membro")).toBeInTheDocument();
		expect(
			await screen.findByRole("heading", { name: "Ana Beatriz Souza" }),
		).toBeInTheDocument();
		expect(screen.getByText("#1 no ranking")).toBeInTheDocument();
	});

	it("fecha o perfil pelo botão do cabeçalho do drawer", async () => {
		render(<AdminMembersPage />);

		const table = screen.getByRole("table");
		fireEvent.click(
			within(table).getByRole("button", {
				name: "Ver perfil de Ana Beatriz Souza",
			}),
		);

		const close = await screen.findByRole("button", { name: "Fechar perfil" });
		fireEvent.click(close);

		await waitFor(() =>
			expect(screen.queryByText("Perfil do membro")).not.toBeInTheDocument(),
		);
	});

	it("abre o convite pelo botão do cabeçalho", async () => {
		render(<AdminMembersPage />);

		fireEvent.click(screen.getByRole("button", { name: "Convidar" }));

		expect(await screen.findByText("Convidar membros")).toBeInTheDocument();
		expect(screen.getByText("Convite expira em 48h")).toBeInTheDocument();
	});
});

describe("levelOf", () => {
	it.each([
		[1840, 7],
		[1620, 6],
		[1485, 6],
		[1320, 5],
		[1260, 5],
	])("%i pontos viram nivel %i", (points, level) => {
		expect(levelOf(points)).toBe(level);
	});

	it("comeca no nivel 0 antes dos 100 primeiros pontos", () => {
		expect(levelOf(0)).toBe(0);
		expect(levelOf(99)).toBe(0);
		expect(levelOf(100)).toBe(1);
	});
});
