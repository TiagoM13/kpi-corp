import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminDashboardPage } from "@/pages/admin/dashboard";
import { renderWithRouter } from "./render-with-router";

const LINKS = [
	"/admin/kpis",
	"/admin/meeting",
	"/admin/members",
	"/admin/ranking",
];

function renderDashboard() {
	return renderWithRouter(
		<AdminDashboardPage name="Ana Beatriz Souza" />,
		LINKS,
	);
}

describe("AdminDashboardPage", () => {
	it("saúda pelo primeiro nome", async () => {
		await renderDashboard();

		expect(
			screen.getByRole("heading", { name: /Ana\. bora reconhecer\./ }),
		).toBeInTheDocument();
	});

	it("mostra os quatro indicadores do time", async () => {
		await renderDashboard();

		expect(screen.getByText("11.640")).toBeInTheDocument();
		expect(screen.getByText("47")).toBeInTheDocument();
		expect(screen.getByText("12 / 12")).toBeInTheDocument();
		expect(screen.getByText("sem KPI há 7 dias ou mais")).toBeInTheDocument();
	});

	it("lista os cinco top movers da semana", async () => {
		await renderDashboard();

		const section = screen
			.getByRole("heading", { name: "Top movers da semana" })
			.closest("section");
		if (!section) throw new Error("secao nao encontrada");

		expect(within(section).getAllByRole("listitem")).toHaveLength(5);
		expect(within(section).getByText("Carla Menezes")).toBeInTheDocument();
	});

	it("lista os esquecidos com o caminho para reconhecer", async () => {
		await renderDashboard();

		const section = screen
			.getByRole("heading", { name: /Atenção — esquecidos/ })
			.closest("section");
		if (!section) throw new Error("secao nao encontrada");

		expect(within(section).getAllByRole("listitem")).toHaveLength(3);
		expect(within(section).getByText("sem KPI há 16 dias")).toBeInTheDocument();
		expect(
			within(section).getAllByRole("link", { name: "Reconhecer" })[0],
		).toHaveAttribute("href", "/admin/members");
	});

	it("mostra o feed de atribuições recentes", async () => {
		await renderDashboard();

		const section = screen
			.getByRole("heading", { name: "Atribuições recentes" })
			.closest("section");
		if (!section) throw new Error("secao nao encontrada");

		expect(within(section).getAllByRole("listitem")).toHaveLength(12);
		expect(within(section).getAllByText("Carla").length).toBeGreaterThan(0);
	});

	it("troca o periodo do grafico", async () => {
		await renderDashboard();

		expect(screen.getByText("Últimas 12 semanas")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "7d" }));

		await waitFor(() =>
			expect(screen.getByText("Últimos 7 dias")).toBeInTheDocument(),
		);
	});

	it("o grafico expoe os valores fora do tooltip", async () => {
		await renderDashboard();

		const table = screen.getByRole("table", {
			name: /Pontos do time/,
		});

		expect(within(table).getByText("1.480")).toBeInTheDocument();
	});

	it("os dois atalhos do topo levam para as telas certas", async () => {
		await renderDashboard();

		expect(screen.getByRole("link", { name: /Novo KPI/ })).toHaveAttribute(
			"href",
			"/admin/kpis",
		);
		expect(
			screen.getByRole("link", { name: /Iniciar modo reunião/ }),
		).toHaveAttribute("href", "/admin/meeting");
	});
});
