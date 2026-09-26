import { ORPCError } from "@orpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	fireEvent,
	render as renderUi,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiCategoryOf } from "@/lib/categories";
import type { ApiKpi } from "@/lib/kpis";
import { MOCK_KPIS } from "@/mocks/kpis";
import { AdminKpisPage } from "@/pages/admin/kpis";

type WritableKpi = Pick<ApiKpi, "name" | "description" | "points" | "category">;

const { clientMock, db } = vi.hoisted(() => ({
	db: { kpis: [] as ApiKpi[] },
	clientMock: {
		kpis: {
			list: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			setStatus: vi.fn(),
		},
	},
}));

vi.mock("@/utils/orpc", async () => {
	const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
	return { client: clientMock, orpc: createTanstackQueryUtils(clientMock) };
});

function seed(): ApiKpi[] {
	return MOCK_KPIS.map((kpi) => ({
		id: kpi.id,
		name: kpi.name,
		description: kpi.description,
		points: kpi.points,
		category: apiCategoryOf(kpi.category),
		active: kpi.active,
		uses: kpi.uses,
		createdAt: new Date("2026-01-01T12:00:00.000Z"),
	}));
}

function nameTaken(name: string, exceptId?: string) {
	return db.kpis.some((kpi) => kpi.name === name && kpi.id !== exceptId);
}

function conflict() {
	return new ORPCError("CONFLICT", { data: { code: "KPI_NAME_TAKEN" } });
}

beforeEach(() => {
	vi.clearAllMocks();
	db.kpis = seed();

	clientMock.kpis.list.mockImplementation(async () => ({
		items: db.kpis,
		total: db.kpis.length,
	}));

	clientMock.kpis.create.mockImplementation(async (input: WritableKpi) => {
		if (nameTaken(input.name)) throw conflict();
		const kpi: ApiKpi = {
			...input,
			id: `new-${db.kpis.length}`,
			active: true,
			uses: 0,
			createdAt: new Date(),
		};
		db.kpis = [...db.kpis, kpi];
		return kpi;
	});

	clientMock.kpis.update.mockImplementation(
		async ({ id, ...input }: WritableKpi & { id: string }) => {
			if (nameTaken(input.name, id)) throw conflict();
			db.kpis = db.kpis.map((kpi) =>
				kpi.id === id ? { ...kpi, ...input } : kpi,
			);
			return db.kpis.find((kpi) => kpi.id === id);
		},
	);

	clientMock.kpis.setStatus.mockImplementation(
		async ({ id, active }: { id: string; active: boolean }) => {
			db.kpis = db.kpis.map((kpi) =>
				kpi.id === id ? { ...kpi, active } : kpi,
			);
			return db.kpis.find((kpi) => kpi.id === id);
		},
	);
});

function render(ui: ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return renderUi(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
	);
}

async function renderLoaded() {
	render(<AdminKpisPage />);
	await screen.findAllByRole("article");
}

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
	it("mostra a contagem de ativos e lista todo o banco", async () => {
		await renderLoaded();

		expect(
			screen.getByRole("heading", { name: "9 indicadores ativos" }),
		).toBeInTheDocument();
		expect(tiles()).toHaveLength(10);
	});

	it("filtra por status", async () => {
		await renderLoaded();

		clickToggle("Ativos");
		await waitFor(() => expect(tiles()).toHaveLength(9));

		clickToggle("Inativos");
		await waitFor(() => expect(tiles()).toHaveLength(1));
	});

	it("filtra por categoria e aceita mais de uma", async () => {
		await renderLoaded();

		clickToggle("Presença");
		await waitFor(() => expect(tiles()).toHaveLength(2));

		clickToggle("Iniciativa");
		await waitFor(() => expect(tiles()).toHaveLength(4));
	});

	it("combina status e categoria em vez de um substituir o outro", async () => {
		await renderLoaded();

		clickToggle("Ativos");
		clickToggle("Comportamento");

		await waitFor(() => expect(tiles()).toHaveLength(3));
		expect(screen.queryByText("Ofuscou (legado)")).not.toBeInTheDocument();
	});

	it("busca no nome e na descricao", async () => {
		await renderLoaded();

		searchFor("incidente");

		await waitFor(() => expect(tiles()).toHaveLength(1));
		expect(screen.getByText("Resolveu bug crítico")).toBeInTheDocument();
	});

	it("explica a lista vazia e oferece limpar os filtros", async () => {
		await renderLoaded();

		searchFor("nao existe esse kpi");
		expect(await screen.findByText("Nada encontrado")).toBeVisible();

		fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

		await waitFor(() => expect(tiles()).toHaveLength(10));
	});

	it("troca para a visao de lista", async () => {
		await renderLoaded();

		expect(screen.queryByRole("table")).not.toBeInTheDocument();

		clickToggle("Ver em lista");

		const table = await screen.findByRole("table");
		expect(table).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "Usos" })).toBeVisible();
	});
});

describe("AdminKpisPage — edicao", () => {
	it("abre o editor preenchido ao clicar no card", async () => {
		await renderLoaded();

		fireEvent.click(
			screen.getByRole("button", { name: "Editar Presença na reunião" }),
		);

		expect(await screen.findByText("Editar KPI")).toBeInTheDocument();
		expect(screen.getByLabelText("Nome")).toHaveValue("Presença na reunião");
		expect(screen.getByLabelText("Pontos")).toHaveValue(5);
	});

	it("salva a edicao e reflete na lista", async () => {
		await renderLoaded();

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
		await renderLoaded();

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
		await renderLoaded();

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
		await renderLoaded();

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
		await renderLoaded();

		fireEvent.click(screen.getByRole("button", { name: "Novo KPI" }));
		await screen.findByText("Novo KPI", { selector: "h2" });

		fireEvent.click(screen.getByRole("button", { name: "Criar KPI" }));

		expect(await screen.findByText("Informe o nome do KPI.")).toBeVisible();
		expect(clientMock.kpis.create).not.toHaveBeenCalled();
	});
});

describe("AdminKpisPage — reabertura do editor", () => {
	it("abre vazio ao criar outro KPI logo apos salvar", async () => {
		await renderLoaded();

		fireEvent.click(screen.getByRole("button", { name: "Novo KPI" }));
		await screen.findByText("Novo KPI", { selector: "h2" });

		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "Pair programming" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Criar KPI" }));
		await waitFor(() => expect(tiles()).toHaveLength(11));

		fireEvent.click(screen.getByRole("button", { name: "Novo KPI" }));
		await screen.findByText("Novo KPI", { selector: "h2" });

		expect(screen.getByLabelText("Nome")).toHaveValue("");
		expect(screen.getByLabelText("Descrição")).toHaveValue("");
	});

	it("descarta o rascunho ao cancelar e reabrir o editor novo", async () => {
		await renderLoaded();

		fireEvent.click(screen.getByRole("button", { name: "Novo KPI" }));
		await screen.findByText("Novo KPI", { selector: "h2" });

		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "Rascunho parado" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

		fireEvent.click(screen.getByRole("button", { name: "Novo KPI" }));
		await screen.findByText("Novo KPI", { selector: "h2" });

		expect(screen.getByLabelText("Nome")).toHaveValue("");
	});

	it("reabre a edicao com os dados salvos", async () => {
		await renderLoaded();

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

		fireEvent.click(
			screen.getByRole("button", { name: "Editar Presença renomeada" }),
		);
		await screen.findByText("Editar KPI");

		expect(screen.getByLabelText("Nome")).toHaveValue("Presença renomeada");
	});
});

describe("AdminKpisPage — inativar", () => {
	it("inativa pelo botao do card e atualiza a contagem", async () => {
		await renderLoaded();

		fireEvent.click(
			within(firstTile()).getByRole("button", { name: /^Inativar/ }),
		);

		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "8 indicadores ativos" }),
			).toBeInTheDocument(),
		);
		expect(
			within(firstTile()).getByRole("button", { name: /^Ativar/ }),
		).toBeInTheDocument();
	});

	it("nao abre o editor ao clicar em inativar", async () => {
		await renderLoaded();

		fireEvent.click(
			within(firstTile()).getByRole("button", { name: /^Inativar/ }),
		);

		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "8 indicadores ativos" }),
			).toBeInTheDocument(),
		);
		expect(screen.queryByText("Editar KPI")).not.toBeInTheDocument();
	});

	it("o KPI inativado some do filtro de ativos", async () => {
		await renderLoaded();

		fireEvent.click(
			within(firstTile()).getByRole("button", { name: /^Inativar/ }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Ativos" }));

		await waitFor(() => expect(tiles()).toHaveLength(8));
	});

	it("reativa pelo botao do card logo apos inativar", async () => {
		await renderLoaded();

		fireEvent.click(
			within(firstTile()).getByRole("button", { name: /^Inativar/ }),
		);

		await waitFor(() =>
			expect(
				within(firstTile()).getByRole("button", { name: /^Ativar/ }),
			).toBeInTheDocument(),
		);

		const activate = within(firstTile()).getByRole("button", {
			name: /^Ativar/,
		});
		expect(activate).toBeEnabled();

		fireEvent.click(activate);

		await waitFor(() =>
			expect(
				within(firstTile()).getByRole("button", { name: /^Inativar/ }),
			).toBeInTheDocument(),
		);
	});
});

describe("AdminKpisPage — API", () => {
	it("mostra carregando antes da primeira resposta", async () => {
		render(<AdminKpisPage />);

		expect(screen.getByText("Carregando KPIs…")).toBeInTheDocument();
		expect(await screen.findAllByRole("article")).toHaveLength(10);
	});

	it("oferece tentar de novo quando a lista falha", async () => {
		clientMock.kpis.list.mockRejectedValueOnce(new Error("offline"));
		render(<AdminKpisPage />);

		fireEvent.click(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		);

		expect(await screen.findAllByRole("article")).toHaveLength(10);
	});

	it("manda a categoria no formato da API e descricao vazia como null", async () => {
		await renderLoaded();

		fireEvent.click(screen.getByRole("button", { name: "Novo KPI" }));
		await screen.findByText("Novo KPI", { selector: "h2" });

		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "  Pair programming  " },
		});
		fireEvent.click(screen.getByRole("button", { name: "Iniciativa" }));
		fireEvent.click(screen.getByRole("button", { name: "Criar KPI" }));

		await waitFor(() =>
			expect(clientMock.kpis.create.mock.lastCall?.[0]).toStrictEqual({
				name: "Pair programming",
				description: null,
				category: "INITIATIVE",
				points: 10,
			}),
		);
	});

	it("aponta o nome repetido no proprio campo", async () => {
		await renderLoaded();

		fireEvent.click(screen.getByRole("button", { name: "Novo KPI" }));
		await screen.findByText("Novo KPI", { selector: "h2" });

		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "Mentoria" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Criar KPI" }));

		expect(
			await screen.findByText("Já existe um KPI com esse nome."),
		).toBeVisible();
		expect(screen.getByText("Novo KPI", { selector: "h2" })).toBeVisible();
	});

	it("inativa pela API com o status invertido", async () => {
		await renderLoaded();

		fireEvent.click(
			within(firstTile()).getByRole("button", { name: /^Inativar/ }),
		);

		await waitFor(() =>
			expect(clientMock.kpis.setStatus).toHaveBeenCalledWith(
				{ id: "k1", active: false },
				expect.anything(),
			),
		);
	});
});
