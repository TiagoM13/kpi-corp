import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemberDashboardPage } from "@/pages/member/dashboard";
import { renderWithRouter } from "./render-with-router";

const { clientMock } = vi.hoisted(() => ({
	clientMock: {
		dashboard: { getMember: vi.fn() },
		profile: { getMyProfile: vi.fn() },
	},
}));

vi.mock("@/utils/orpc", async () => {
	const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
	return { client: clientMock, orpc: createTanstackQueryUtils(clientMock) };
});

const LEVEL = {
	level: 0,
	tier: "INICIANTE" as const,
	currentPoints: 60,
	levelFloor: 0,
	nextLevel: 1,
	nextLevelPoints: 100,
	progress: 60,
	nextTier: "INICIANTE" as const,
};

const DASHBOARD = {
	user: { id: "carla", name: "Carla Dias", position: "Dev", role: "MEMBER" },
	points: 60,
	kpiCount: 7,
	rankingPosition: 3,
	teamSize: 5,
	level: LEVEL,
	weekPoints: 35,
	weekSeries: [10, 25],
	rankingChange: 2,
};

function badge(code: string, name: string, earned: boolean, current = 0) {
	return {
		code,
		name,
		description: name,
		icon: "🏅",
		rarity: "COMUM",
		available: true,
		earned,
		earnedAt: earned ? new Date() : null,
		current,
		target: null,
		progress: 0,
	};
}

const PROFILE = {
	member: {
		id: "carla",
		name: "Carla Dias",
		position: "Dev",
		role: "MEMBER",
		email: "carla@kpicorp.com",
		active: true,
		createdAt: new Date("2026-09-19T12:00:00.000Z"),
	},
	total: 60,
	categories: { presence: 15, performance: 0, behavior: 7, initiative: 38 },
	level: LEVEL,
	kpis: [
		{
			id: "a1",
			kpiId: "k1",
			name: "Documentou processo",
			category: "INITIATIVE",
			points: 8,
			note: null,
			assignedAt: new Date("2026-09-25T12:00:00.000Z"),
			revokedAt: null,
		},
		{
			id: "a2",
			kpiId: "k2",
			name: "Chegou no horário",
			category: "PRESENCE",
			points: 3,
			note: null,
			assignedAt: new Date("2026-09-24T12:00:00.000Z"),
			revokedAt: new Date("2026-09-24T13:00:00.000Z"),
		},
	],
	badges: [
		badge("FIRST_POINT", "Primeira pontuação", true),
		badge("TOP_THREE", "Pódio", true),
		badge("TEN_MEETINGS", "Dez reuniões", false),
		badge("FOUR_WEEK_STREAK", "Constante", false, 3),
	],
};

function renderDashboard(name = "Carla Dias") {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return renderWithRouter(
		<QueryClientProvider client={queryClient}>
			<MemberDashboardPage name={name} />
		</QueryClientProvider>,
		["/ranking"],
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	clientMock.dashboard.getMember.mockResolvedValue(DASHBOARD);
	clientMock.profile.getMyProfile.mockResolvedValue(PROFILE);
});

describe("MemberDashboardPage", () => {
	it("mostra o proprio perfil com a posicao que a API entrega", async () => {
		await renderDashboard();

		expect(
			await screen.findByRole("heading", { name: "Carla Dias" }),
		).toBeInTheDocument();
		expect(screen.getByText("#3 no ranking")).toBeInTheDocument();
		expect(screen.getByText("#3 de 5")).toBeInTheDocument();
		expect(screen.getByText("Dev · carla@kpicorp.com")).toBeInTheDocument();
	});

	it("mostra pontos, KPIs e conquistas como vieram", async () => {
		await renderDashboard();

		expect(await screen.findByText("60")).toBeInTheDocument();
		expect(screen.getByText("7")).toBeInTheDocument();
		expect(screen.getByText("2 / 4")).toBeInTheDocument();
	});

	it("mostra os pontos da semana como a API entrega, sem recalcular", async () => {
		await renderDashboard();

		const card = (await screen.findByText("Pontos nesta semana")).closest(
			"div",
		)?.parentElement;
		if (!card) throw new Error("card nao encontrado");

		expect(within(card).getByText("35")).toBeInTheDocument();
		expect(within(card).getByText("semana atual")).toBeInTheDocument();
	});

	it("mostra quantas posições o membro subiu no ranking desde o início da semana", async () => {
		await renderDashboard();

		expect(await screen.findByText("subiu 2 posições")).toBeInTheDocument();
	});

	it("descer no ranking aparece como queda", async () => {
		clientMock.dashboard.getMember.mockResolvedValue({
			...DASHBOARD,
			rankingChange: -1,
		});
		await renderDashboard();

		expect(await screen.findByText("desceu 1 posição")).toBeInTheDocument();
	});

	it.each([0, null])(
		"sem variação (%s) o selo de ranking não mostra seta",
		async (change) => {
			clientMock.dashboard.getMember.mockResolvedValue({
				...DASHBOARD,
				rankingChange: change,
			});
			await renderDashboard();

			await screen.findByText("#3 no ranking");

			expect(screen.queryByText(/subiu|desceu/)).not.toBeInTheDocument();
		},
	);

	it("mostra a sequência de semanas pontuando, vinda da badge de constância", async () => {
		await renderDashboard();

		expect(
			await screen.findByLabelText("Sequência de 3 semanas"),
		).toBeInTheDocument();
	});

	it("sem sequência, não mostra o selo", async () => {
		clientMock.profile.getMyProfile.mockResolvedValue({
			...PROFILE,
			badges: PROFILE.badges.filter((item) => item.code !== "FOUR_WEEK_STREAK"),
		});
		await renderDashboard();

		await screen.findByRole("heading", { name: "Carla Dias" });

		expect(screen.queryByLabelText(/Sequência de/)).not.toBeInTheDocument();
	});

	it("traz historico, categorias e conquistas do perfil", async () => {
		await renderDashboard();
		await screen.findByRole("heading", { name: "Carla Dias" });

		for (const title of [
			"Histórico de KPIs",
			"Distribuição por categoria",
			"Conquistas",
		]) {
			expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
		}
	});

	it("marca no historico o que foi revogado", async () => {
		await renderDashboard();

		const history = (
			await screen.findByRole("heading", { name: "Histórico de KPIs" })
		).closest("section");
		if (!history) throw new Error("historico nao encontrado");

		expect(within(history).getByText(/revogado/)).toBeInTheDocument();
		expect(within(history).getByText("Documentou processo")).not.toHaveClass(
			"line-through",
		);
		expect(within(history).getByText("Chegou no horário")).toHaveClass(
			"line-through",
		);
	});

	it("explica a falta de pontuacao para quem ainda nao recebeu KPI", async () => {
		clientMock.dashboard.getMember.mockResolvedValue({
			...DASHBOARD,
			points: 0,
			kpiCount: 0,
		});
		await renderDashboard("Novo Membro");

		expect(
			await screen.findByText("Novo, você ainda não tem pontuação"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Ver o ranking do time" }),
		).toHaveAttribute("href", "/ranking?periodo=geral");
	});

	it("oferece tentar de novo quando o painel falha", async () => {
		clientMock.profile.getMyProfile.mockRejectedValueOnce(new Error("offline"));
		await renderDashboard();

		fireEvent.click(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		);

		expect(
			await screen.findByRole("heading", { name: "Carla Dias" }),
		).toBeInTheDocument();
	});
});
