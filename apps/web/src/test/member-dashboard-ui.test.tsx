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
	recentKpis: [],
};

function badge(code: string, name: string, earned: boolean) {
	return {
		code,
		name,
		description: name,
		icon: "🏅",
		rarity: "COMUM",
		available: true,
		earned,
		earnedAt: earned ? new Date() : null,
		current: 0,
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
		expect(screen.getByText("2 / 3")).toBeInTheDocument();
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
