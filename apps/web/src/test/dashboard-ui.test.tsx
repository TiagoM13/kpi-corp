import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminDashboard } from "@/lib/dashboard";
import { AdminDashboardPage } from "@/pages/admin/dashboard";
import { renderWithRouter } from "./render-with-router";

const { clientMock } = vi.hoisted(() => ({
	clientMock: { dashboard: { getAdmin: vi.fn(), getPointsSeries: vi.fn() } },
}));

vi.mock("@/utils/orpc", async () => {
	const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
	return { client: clientMock, orpc: createTanstackQueryUtils(clientMock) };
});

const LINKS = [
	"/admin/kpis",
	"/admin/meeting",
	"/admin/members",
	"/admin/ranking",
];

function member(id: string, name: string) {
	return { id, name, position: "Dev", role: "MEMBER" as const };
}

const DASHBOARD: AdminDashboard = {
	members: { active: 4, total: 5 },
	kpis: { week: 3, month: 12, weekDelta: 20 },
	meetings: { week: 2, month: 4, open: 0 },
	points: { week: 40, month: 1234, total: 9876, monthDelta: -5 },
	withoutKpisDays: 45,
	trends: {
		points: [10, 20, 30, 25, 40, 35, 50, 60],
		kpis: [1, 2, 0, 3, 2, 4, 3],
	},
	movers: [
		{
			position: 1,
			member: member("m2", "Carla Dias"),
			points: 80,
			kpiCount: 4,
			change: 2,
			series: [10, 30, 40],
		},
		{
			position: 2,
			member: member("m1", "Ana Souza"),
			points: 50,
			kpiCount: 3,
			change: -1,
			series: [50],
		},
		{
			position: 3,
			member: member("m3", "Bruno Lima"),
			points: 20,
			kpiCount: 1,
			change: null,
			series: [10, 10],
		},
	],
	ranking: [
		{ position: 1, member: member("m1", "Ana Souza"), points: 35, kpiCount: 5 },
		{
			position: 2,
			member: member("m2", "Carla Dias"),
			points: 35,
			kpiCount: 3,
		},
	],
	recentAssignments: [
		{
			id: "a1",
			kpiId: "k1",
			userId: "m1",
			assignedBy: "admin",
			meetingId: "meet1",
			note: null,
			points: 12,
			revokedAt: null,
			assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
			kpi: { id: "k1", name: "Entregou no prazo", category: "PERFORMANCE" },
			user: { id: "m1", name: "Ana Souza", position: "Dev" },
			assigner: { id: "admin", name: "Eduardo Santos" },
			meeting: { id: "meet1", title: "Daily de terça" },
		},
		{
			id: "a2",
			kpiId: "k2",
			userId: "m2",
			assignedBy: "admin",
			meetingId: null,
			note: null,
			points: 5,
			revokedAt: new Date(),
			assignedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
			kpi: { id: "k2", name: "Presença na reunião", category: "PRESENCE" },
			user: { id: "m2", name: "Carla Dias", position: "Dev" },
			assigner: { id: "admin", name: "Eduardo Santos" },
			meeting: null,
		},
	],
	membersWithoutKpis: [
		{
			id: "m3",
			name: "Bruno Lima",
			position: "Dev",
			lastAssignmentAt: new Date("2026-07-01T12:00:00.000Z"),
			daysWithout: 45,
		},
		{
			id: "m4",
			name: "Diego Alves",
			position: null,
			lastAssignmentAt: null,
			daysWithout: 60,
		},
	],
};

const SERIES = {
	period: "90d" as const,
	buckets: [
		{ start: "2026-08-31", points: 120, kpiCount: 10 },
		{ start: "2026-09-07", points: 180, kpiCount: 14 },
		{ start: "2026-09-14", points: 240, kpiCount: 19 },
	],
};

function renderDashboard() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return renderWithRouter(
		<QueryClientProvider client={queryClient}>
			<AdminDashboardPage name="Ana Beatriz Souza" />
		</QueryClientProvider>,
		LINKS,
	);
}

function section(title: string) {
	const heading = screen.getByRole("heading", { name: title });
	const element = heading.closest("section");
	if (!element) throw new Error(`secao ${title} nao encontrada`);
	return element;
}

beforeEach(() => {
	vi.clearAllMocks();
	clientMock.dashboard.getAdmin.mockResolvedValue(DASHBOARD);
	clientMock.dashboard.getPointsSeries.mockResolvedValue(SERIES);
});

describe("AdminDashboardPage", () => {
	it("saúda pelo primeiro nome", async () => {
		await renderDashboard();

		expect(
			screen.getByRole("heading", { name: /Ana\. bora reconhecer\./ }),
		).toBeInTheDocument();
	});

	it("mostra os indicadores como a API entrega", async () => {
		await renderDashboard();

		expect(await screen.findByText("Pontos totais")).toBeInTheDocument();
		expect(screen.getByText("9.876")).toBeInTheDocument();
		expect(screen.getByText("2 reuniões nesta semana")).toBeInTheDocument();
		expect(screen.getByText("4 / 5")).toBeInTheDocument();
	});

	it("mostra o total do time e o mês com a variação contra o mês anterior", async () => {
		await renderDashboard();

		expect(
			await screen.findByText("1.234 no mês · -5% vs. mês anterior"),
		).toBeInTheDocument();
	});

	it("sem variação do mês, mostra só os pontos do mês", async () => {
		clientMock.dashboard.getAdmin.mockResolvedValue({
			...DASHBOARD,
			points: { ...DASHBOARD.points, monthDelta: null },
		});
		await renderDashboard();

		expect(await screen.findByText("1.234 no mês")).toBeInTheDocument();
	});

	it("mostra a variação de KPIs da semana vinda da API", async () => {
		await renderDashboard();

		const card = (await screen.findByText("KPIs nesta semana")).closest("div");
		if (!card?.parentElement) throw new Error("card nao encontrado");

		expect(within(card.parentElement).getByText("20%")).toBeInTheDocument();
		expect(
			within(card.parentElement).getByText("acima do período anterior"),
		).toBeInTheDocument();
	});

	it("sem período anterior para comparar, o card de KPIs fica sem variação", async () => {
		clientMock.dashboard.getAdmin.mockResolvedValue({
			...DASHBOARD,
			kpis: { ...DASHBOARD.kpis, weekDelta: null },
		});
		await renderDashboard();

		await screen.findByText("KPIs nesta semana");

		expect(
			screen.queryByText("acima do período anterior"),
		).not.toBeInTheDocument();
	});

	it("o texto do card Sem KPI usa o limite da API, não um número fixo", async () => {
		await renderDashboard();

		expect(await screen.findByText("há 45 dias ou mais")).toBeInTheDocument();
	});

	it("lista o top do mes da API", async () => {
		await renderDashboard();
		await screen.findByText("Pontos totais");

		const top = section("Top 5 do mês");
		const items = within(top).getAllByRole("listitem");
		expect(items).toHaveLength(2);
		expect(items[0]).toHaveTextContent("Ana Souza");
		expect(items[0]).toHaveTextContent("5 KPIs");
	});

	it("lista os esquecidos com dias sem KPI e quem nunca recebeu", async () => {
		await renderDashboard();

		expect(await screen.findByText("sem KPI há 45 dias")).toBeInTheDocument();
		expect(
			screen.getByText("nunca recebeu KPI · 60 dias no time"),
		).toBeInTheDocument();
		expect(screen.getAllByRole("link", { name: "Reconhecer" })).toHaveLength(2);
	});

	it("some com o card de esquecidos quando ninguem esta parado", async () => {
		clientMock.dashboard.getAdmin.mockResolvedValue({
			...DASHBOARD,
			membersWithoutKpis: [],
		});
		await renderDashboard();
		await screen.findByText("Pontos totais");

		expect(screen.queryByText("Atenção — esquecidos")).not.toBeInTheDocument();
	});

	it("mostra o feed com contexto e marca o que foi revogado", async () => {
		await renderDashboard();
		await screen.findByText("Pontos totais");

		const feed = section("Atribuições recentes");
		expect(within(feed).getByText("Entregou no prazo")).toBeInTheDocument();
		expect(
			within(feed).getByText("há 2 horas · por Eduardo · Daily de terça"),
		).toBeInTheDocument();
		expect(
			within(feed).getByText("ontem · por Eduardo · avulso · revogado"),
		).toBeInTheDocument();
	});

	it("desenha a série de pontos do time, por padrão as últimas 12 semanas", async () => {
		await renderDashboard();

		expect(
			await screen.findByRole("img", {
				name: /Pontos do time — Últimas 12 semanas/,
			}),
		).toBeInTheDocument();
		expect(
			clientMock.dashboard.getPointsSeries.mock.lastCall?.[0],
		).toStrictEqual({ period: "90d" });
	});

	it("troca o período do gráfico e pede a série nova à API", async () => {
		await renderDashboard();
		await screen.findByRole("img", { name: /Últimas 12 semanas/ });

		fireEvent.click(screen.getByRole("button", { name: "7d" }));

		await waitFor(() =>
			expect(
				clientMock.dashboard.getPointsSeries.mock.lastCall?.[0],
			).toStrictEqual({ period: "7d" }),
		);
		expect(
			await screen.findByRole("img", { name: /Últimos 7 dias/ }),
		).toBeInTheDocument();
	});

	it("oferece tentar de novo quando a série falha, sem derrubar o painel", async () => {
		clientMock.dashboard.getPointsSeries.mockRejectedValueOnce(
			new Error("offline"),
		);
		await renderDashboard();

		const card = (await screen.findByText("Pontos por semana")).closest(
			"section",
		);
		if (!card) throw new Error("card do gráfico nao encontrado");

		fireEvent.click(
			await within(card).findByRole("button", { name: "Tentar de novo" }),
		);

		expect(
			await screen.findByRole("img", { name: /Últimas 12 semanas/ }),
		).toBeInTheDocument();
		expect(screen.getByText("Pontos totais")).toBeInTheDocument();
	});

	it("lista os top movers da semana com pontos, variação e tendência", async () => {
		await renderDashboard();
		await screen.findByText("Pontos totais");

		const movers = section("Top movers da semana");
		const items = within(movers).getAllByRole("listitem");

		expect(items).toHaveLength(3);
		expect(items[0]).toHaveTextContent("Carla Dias");
		expect(items[0]).toHaveTextContent("+80");
		expect(
			within(items[0] as HTMLElement).getByText("subiu 2 posições"),
		).toBeInTheDocument();
		expect(
			within(items[1] as HTMLElement).getByText("desceu 1 posição"),
		).toBeInTheDocument();
		expect(items[2]).not.toHaveTextContent(/subiu|desceu/);
		expect(
			within(items[0] as HTMLElement).getByRole("img", {
				name: "Tendência de Carla Dias",
			}),
		).toBeInTheDocument();
		expect(
			within(items[1] as HTMLElement).queryByRole("img", { name: /Tendência/ }),
		).not.toBeInTheDocument();
	});

	it("sem ninguém pontuando na semana, o card de movers explica", async () => {
		clientMock.dashboard.getAdmin.mockResolvedValue({
			...DASHBOARD,
			movers: [],
		});
		await renderDashboard();
		await screen.findByText("Pontos totais");

		expect(
			within(section("Top movers da semana")).getByText(
				"Ninguém pontuou nesta semana ainda",
			),
		).toBeInTheDocument();
	});

	it("oferece continuar quando ha reuniao aberta", async () => {
		clientMock.dashboard.getAdmin.mockResolvedValue({
			...DASHBOARD,
			meetings: { ...DASHBOARD.meetings, open: 1 },
		});
		await renderDashboard();

		expect(
			await screen.findByRole("link", { name: "Continuar reunião aberta" }),
		).toHaveAttribute("href", "/admin/meeting");
	});

	it("oferece tentar de novo quando o painel falha", async () => {
		clientMock.dashboard.getAdmin.mockRejectedValueOnce(new Error("offline"));
		await renderDashboard();

		fireEvent.click(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		);

		expect(await screen.findByText("Pontos totais")).toBeInTheDocument();
	});

	it("os dois atalhos do topo levam para as telas certas", async () => {
		await renderDashboard();

		expect(screen.getByRole("link", { name: "Novo KPI" })).toHaveAttribute(
			"href",
			"/admin/kpis",
		);
		expect(
			screen.getByRole("link", { name: "Iniciar modo reunião" }),
		).toHaveAttribute("href", "/admin/meeting");
	});
});
