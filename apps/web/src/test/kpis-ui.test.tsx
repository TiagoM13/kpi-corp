import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useKpiStore } from "@/lib/kpi-store";
import { MOCK_KPIS } from "@/mocks/kpis";
import { AdminKpisPage } from "@/pages/admin/kpis";

beforeEach(() => {
	localStorage.clear();
	useKpiStore.setState({ kpis: MOCK_KPIS });
});

function tiles() {
	return screen.queryAllByRole("article");
}

function firstTile() {
	const [tile] = screen.getAllByRole("article");
	if (!tile) throw new Error("nenhum card renderizado");
	return tile;
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

describe("AdminKpisPage — edicao", () => {
	it("abre o editor preenchido ao clicar no card", async () => {
		render(<AdminKpisPage />);

		fireEvent.click(
			screen.getByRole("button", { name: "Editar Presença na reunião" }),
		);

		expect(await screen.findByText("Editar KPI")).toBeInTheDocument();
		expect(screen.getByLabelText("Nome")).toHaveValue("Presença na reunião");
		expect(screen.getByLabelText("Pontos")).toHaveValue(5);
	});

	it("salva a edicao e reflete na lista", async () => {
		render(<AdminKpisPage />);

		fireEvent.click(
			screen.getByRole("button", { name: "Editar Presença na reunião" }),
		);
		await screen.findByText("Editar KPI");

		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "Presença renomeada" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

		await waitFor(() =>
			expect(screen.getByText("Presença renomeada")).toBeInTheDocument(),
		);
		expect(tiles()).toHaveLength(10);
	});

	it("cria um KPI novo e conta ele nos ativos", async () => {
		render(<AdminKpisPage />);

		fireEvent.click(screen.getByRole("button", { name: "Novo KPI" }));
		expect(
			await screen.findByText("Novo KPI", { selector: "h2" }),
		).toBeVisible();

		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "Pair programming" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Criar KPI" }));

		await waitFor(() => expect(tiles()).toHaveLength(11));
		expect(
			screen.getByRole("heading", { name: "10 indicadores ativos" }),
		).toBeInTheDocument();
	});

	it("fecha o editor pelo botao do cabecalho", async () => {
		render(<AdminKpisPage />);

		fireEvent.click(screen.getByRole("button", { name: "Novo KPI" }));
		await screen.findByText("Novo KPI", { selector: "h2" });

		fireEvent.click(
			screen.getByRole("button", { name: "Fechar editor de KPI" }),
		);

		await waitFor(() =>
			expect(
				screen.queryByText("Novo KPI", { selector: "h2" }),
			).not.toBeInTheDocument(),
		);
	});

	it("mantem cabecalho e acoes fora da area que rola", async () => {
		render(<AdminKpisPage />);

		fireEvent.click(screen.getByRole("button", { name: "Novo KPI" }));
		const title = await screen.findByText("Novo KPI", { selector: "h2" });

		const dialog = title.closest("[data-slot=dialog-content]");
		const scroller = dialog?.querySelector(".overflow-y-auto");
		const submit = screen.getByRole("button", { name: "Criar KPI" });

		expect(scroller).not.toBeNull();
		expect(scroller?.contains(title)).toBe(false);
		expect(scroller?.contains(submit)).toBe(false);
		expect(
			scroller?.querySelector("[data-slot=input-group],input,textarea"),
		).not.toBeNull();
	});

	it("recusa KPI sem nome", async () => {
		render(<AdminKpisPage />);

		fireEvent.click(screen.getByRole("button", { name: "Novo KPI" }));
		await screen.findByText("Novo KPI", { selector: "h2" });

		fireEvent.click(screen.getByRole("button", { name: "Criar KPI" }));

		expect(await screen.findByText("Informe o nome do KPI.")).toBeVisible();
		expect(useKpiStore.getState().kpis).toHaveLength(10);
	});
});

describe("AdminKpisPage — inativar", () => {
	it("inativa pelo botao do card e atualiza a contagem", async () => {
		render(<AdminKpisPage />);

		fireEvent.click(
			within(firstTile()).getByRole("button", { name: "Inativar" }),
		);

		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "8 indicadores ativos" }),
			).toBeInTheDocument(),
		);
		expect(
			within(firstTile()).getByRole("button", { name: "Ativar" }),
		).toBeInTheDocument();
	});

	it("nao abre o editor ao clicar em inativar", async () => {
		render(<AdminKpisPage />);

		fireEvent.click(
			within(firstTile()).getByRole("button", { name: "Inativar" }),
		);

		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "8 indicadores ativos" }),
			).toBeInTheDocument(),
		);
		expect(screen.queryByText("Editar KPI")).not.toBeInTheDocument();
	});

	it("o KPI inativado some do filtro de ativos", async () => {
		render(<AdminKpisPage />);

		fireEvent.click(
			within(firstTile()).getByRole("button", { name: "Inativar" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Ativos" }));

		await waitFor(() => expect(tiles()).toHaveLength(8));
	});
});
