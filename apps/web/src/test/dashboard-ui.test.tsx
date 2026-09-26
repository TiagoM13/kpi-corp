import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminDashboard } from "@/lib/dashboard";
import { AdminDashboardPage } from "@/pages/admin/dashboard";
import { renderWithRouter } from "./render-with-router";

const { clientMock } = vi.hoisted(() => ({
	clientMock: { dashboard: { getAdmin: vi.fn() } },
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
