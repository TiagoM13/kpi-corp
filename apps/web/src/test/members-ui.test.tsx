import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { levelOf } from "@/lib/member-stats";
import type { MemberListItem } from "@/lib/members";
import { AdminMembersPage } from "@/pages/admin/members";

const { clientMock } = vi.hoisted(() => ({
	clientMock: {
		members: { list: vi.fn(), invite: vi.fn() },
		profile: { getPublicProfile: vi.fn() },
	},
}));

vi.mock("@/utils/orpc", async () => {
	const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
	return { client: clientMock, orpc: createTanstackQueryUtils(clientMock) };
});

const DAY_MS = 24 * 60 * 60 * 1000;

function level(levelNumber: number, points: number) {
	return {
		level: levelNumber,
		tier: "INICIANTE" as const,
		currentPoints: points,
		levelFloor: levelNumber * 100,
		nextLevel: levelNumber + 1,
		nextLevelPoints: (levelNumber + 1) * 100,
		progress: points % 100,
		nextTier: "INICIANTE" as const,
	};
}

const ANA: MemberListItem = {
	id: "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf",
	name: "Ana Souza",
	email: "ana@kpicorp.com",
	role: "MEMBER" as const,
	position: "Designer",
	active: true,
	createdAt: new Date("2025-01-10T12:00:00.000Z"),
	points: 250,
	kpiCount: 7,
	lastAssignmentAt: new Date(),
	level: level(2, 250),
};

const BRUNO: MemberListItem = {
	...ANA,
	id: "b29f5637-0ab1-4de0-b2d2-d364e3903124",
	name: "Bruno Lima",
	email: "bruno@kpicorp.com",
	position: null,
	points: 40,
	kpiCount: 1,
	lastAssignmentAt: new Date(Date.now() - 45 * DAY_MS),
	level: level(0, 40),
};

const CARLA: MemberListItem = {
	...ANA,
	id: "3c1e2f4a-5b6c-4d7e-8f90-a1b2c3d4e5f6",
	name: "Carla Dias",
	email: "carla@kpicorp.com",
	active: false,
};

function listResponse(items: MemberListItem[], total = items.length) {
	return {
		items,
		page: 1,
		limit: 20,
		total,
		totalPages: Math.max(1, Math.ceil(total / 20)),
	};
}

const PROFILE = {
	member: {
		id: ANA.id,
		name: ANA.name,
		position: ANA.position,
		role: ANA.role,
	},
	total: 250,
	categories: { presence: 50, performance: 100, behavior: 60, initiative: 40 },
	level: ANA.level,
	kpis: [
		{
			id: "a1",
			kpiId: "k1",
			name: "Entregou no prazo",
			category: "PERFORMANCE" as const,
			points: 12,
			note: "Sprint 12",
			assignedAt: new Date("2026-09-20T12:00:00.000Z"),
			revokedAt: null,
		},
	],
	badges: [],
};

function renderPage() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<AdminMembersPage />
		</QueryClientProvider>,
	);
}

async function memberRows() {
	const table = await screen.findByRole("table");
	return within(table).getAllByRole("row").slice(1);
}

function searchFor(term: string) {
	fireEvent.change(screen.getByRole("searchbox", { name: /buscar membro/i }), {
		target: { value: term },
	});
}

function lastListInput() {
	return clientMock.members.list.mock.lastCall?.[0];
}

beforeEach(() => {
	vi.clearAllMocks();
	clientMock.members.list.mockResolvedValue(listResponse([ANA, BRUNO, CARLA]));
	clientMock.profile.getPublicProfile.mockResolvedValue(PROFILE);
});

describe("AdminMembersPage", () => {
	it("lista o time vindo da API", async () => {
		renderPage();

		expect(await memberRows()).toHaveLength(3);
		expect(
			screen.getByRole("heading", { name: "3 membros" }),
		).toBeInTheDocument();
		expect(lastListInput()).toMatchObject({
			page: 1,
			limit: 20,
			status: "ALL",
		});
	});

	it("mostra pontos, nivel e status de cada membro", async () => {
		renderPage();

		const [ana, bruno, carla] = await memberRows();

		expect(within(ana as HTMLElement).getByText("250")).toBeInTheDocument();
		expect(within(ana as HTMLElement).getByText("Ativo")).toBeInTheDocument();
		expect(
			within(bruno as HTMLElement).getByText("45d sem KPI"),
		).toBeInTheDocument();
		expect(
			within(carla as HTMLElement).getByText("Inativo"),
		).toBeInTheDocument();
	});

	it("busca no servidor pelo termo digitado", async () => {
		renderPage();
		await memberRows();

		clientMock.members.list.mockResolvedValue(listResponse([CARLA]));
		searchFor("  carla ");

		await waitFor(() =>
			expect(lastListInput()).toMatchObject({ search: "carla", page: 1 }),
		);
		await waitFor(async () => expect(await memberRows()).toHaveLength(1));
	});

	it("explica a lista vazia em vez de mostrar tabela sem linha", async () => {
		clientMock.members.list.mockResolvedValue(listResponse([]));
		renderPage();

		expect(await screen.findByText(/nenhum membro encontrado/i)).toBeVisible();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("oferece tentar de novo quando a lista falha", async () => {
		clientMock.members.list.mockRejectedValueOnce(new Error("offline"));
		renderPage();

		fireEvent.click(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		);

		expect(await memberRows()).toHaveLength(3);
	});

	it("pagina quando o time passa de uma pagina", async () => {
		clientMock.members.list.mockResolvedValue(
			listResponse([ANA, BRUNO, CARLA], 45),
		);
		renderPage();

		expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));

		await waitFor(() => expect(lastListInput()).toMatchObject({ page: 2 }));
	});

	it("abre o perfil do membro com o historico da API", async () => {
		renderPage();

		const table = await screen.findByRole("table");
		fireEvent.click(
			within(table).getByRole("button", { name: "Ver perfil de Ana Souza" }),
		);

		expect(await screen.findByText("Perfil do membro")).toBeInTheDocument();
		expect(
			await screen.findByRole("heading", { name: "Ana Souza" }),
		).toBeInTheDocument();
		expect(await screen.findByText("Entregou no prazo")).toBeInTheDocument();
		expect(clientMock.profile.getPublicProfile).toHaveBeenCalledWith(
			{ id: ANA.id },
			expect.anything(),
		);
	});

	it("nao busca o perfil publico de membro inativo", async () => {
		renderPage();

		const table = await screen.findByRole("table");
		fireEvent.click(
			within(table).getByRole("button", { name: "Ver perfil de Carla Dias" }),
		);

		expect(await screen.findByText("Membro inativo")).toBeInTheDocument();
		expect(clientMock.profile.getPublicProfile).not.toHaveBeenCalled();
	});

	it("fecha o perfil pelo botão do cabeçalho do drawer", async () => {
		renderPage();

		const table = await screen.findByRole("table");
		fireEvent.click(
			within(table).getByRole("button", { name: "Ver perfil de Ana Souza" }),
		);

		const close = await screen.findByRole("button", { name: "Fechar perfil" });
		fireEvent.click(close);

		await waitFor(() =>
			expect(screen.queryByText("Perfil do membro")).not.toBeInTheDocument(),
		);
	});

	it("abre o convite pelo botão do cabeçalho", async () => {
		renderPage();

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
