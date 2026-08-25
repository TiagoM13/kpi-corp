import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminKpisPage } from "@/pages/admin/kpis";

function tiles() {
	return screen.queryAllByRole("article");
}

function clickToggle(name: string) {
	fireEvent.click(screen.getByRole("button", { name }));
}

function searchFor(term: string) {
	fireEvent.change(screen.getByRole("searchbox", { name: /buscar kpi/i }), {
		target: { value: term },
	});
}

describe("AdminKpisPage", () => {
	it("mostra a contagem de ativos e lista todo o banco", () => {
		render(<AdminKpisPage />);

		expect(
			screen.getByRole("heading", { name: "9 indicadores ativos" }),
		).toBeInTheDocument();
		expect(tiles()).toHaveLength(10);
	});

	it("filtra por status", async () => {
		render(<AdminKpisPage />);

		clickToggle("Ativos");
		await waitFor(() => expect(tiles()).toHaveLength(9));

		clickToggle("Inativos");
		await waitFor(() => expect(tiles()).toHaveLength(1));
	});

	it("filtra por categoria e aceita mais de uma", async () => {
		render(<AdminKpisPage />);

		clickToggle("Presença");
		await waitFor(() => expect(tiles()).toHaveLength(2));

		clickToggle("Iniciativa");
		await waitFor(() => expect(tiles()).toHaveLength(4));
	});

	it("combina status e categoria em vez de um substituir o outro", async () => {
		render(<AdminKpisPage />);

		clickToggle("Ativos");
		clickToggle("Comportamento");

		await waitFor(() => expect(tiles()).toHaveLength(3));
		expect(screen.queryByText("Ofuscou (legado)")).not.toBeInTheDocument();
	});

	it("busca no nome e na descricao", async () => {
		render(<AdminKpisPage />);

		searchFor("incidente");

		await waitFor(() => expect(tiles()).toHaveLength(1));
		expect(screen.getByText("Resolveu bug crítico")).toBeInTheDocument();
	});

	it("explica a lista vazia e oferece limpar os filtros", async () => {
		render(<AdminKpisPage />);

		searchFor("nao existe esse kpi");
		expect(await screen.findByText("Nada encontrado")).toBeVisible();

		fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

		await waitFor(() => expect(tiles()).toHaveLength(10));
	});

	it("troca para a visao de lista", async () => {
		render(<AdminKpisPage />);

		expect(screen.queryByRole("table")).not.toBeInTheDocument();

		clickToggle("Ver em lista");

		const table = await screen.findByRole("table");
		expect(table).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "Usos" })).toBeVisible();
	});
});
