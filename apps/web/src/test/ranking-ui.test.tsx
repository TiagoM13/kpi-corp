import { ORPCError } from "@orpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RankingBoard } from "@/components/ranking";
import {
	MEMBER_RANKING_PERIODS,
	RANKING_PERIODS,
	type RankingPeriod,
	type TeamRanking,
	type TeamRankingEntry,
} from "@/lib/ranking";
import { AdminRankingPage } from "@/pages/admin/ranking";

const { clientMock } = vi.hoisted(() => ({
	clientMock: {
		ranking: { get: vi.fn() },
		profile: { getPublicProfile: vi.fn() },
	},
}));

vi.mock("@/utils/orpc", async () => {
	const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
	return { client: clientMock, orpc: createTanstackQueryUtils(clientMock) };
});

const NAMES = [
	"Ana Souza",
	"Bruno Lima",
	"Carla Dias",
	"Diego Alves",
	"Eva Rocha",
];

function entry(
	index: number,
	overrides: Partial<TeamRankingEntry> = {},
): TeamRankingEntry {
	const name = NAMES[index] ?? `Membro ${index}`;
	return {
		position: index + 1,
		member: {
			id: `m${index + 1}`,
			name,
			position: "Dev",
			role: "MEMBER",
		},
		points: 100 - index * 10,
		kpiCount: 5 - index,
		change: null,
		isMe: false,
		...overrides,
	};
}

function ranking(
	period: RankingPeriod,
	items: TeamRankingEntry[],
	me: TeamRanking["me"] = null,
): TeamRanking {
	const windowed = period !== "all";
	return {
		period,
		periodStart: windowed ? "2026-09-01" : null,
		periodEnd: windowed ? "2026-09-30" : null,
		items,
		me,
	};
}

const ALL = ranking("all", [
	entry(0),
	entry(1),
	entry(2),
	entry(3, { isMe: true, change: 2 }),
	entry(4, { change: -1 }),
]);

function renderWithClient(ui: React.ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
	);
}

function Harness({
	periods = MEMBER_RANKING_PERIODS,
	onOpenMember,
}: {
	periods?: RankingPeriod[];
	onOpenMember?: (member: TeamRankingEntry["member"]) => void;
}) {
	const [period, setPeriod] = useState<RankingPeriod>("all");

	return (
		<RankingBoard
			period={period}
			periods={periods}
			onPeriodChange={setPeriod}
			onOpenMember={onOpenMember}
		/>
	);
}

function podiumNames() {
	const section = screen.getByRole("region", { name: "Pódio" });
	return within(section)
		.getAllByRole("listitem")
		.map((item) => item.textContent ?? "");
}

async function tableRows() {
	const table = await screen.findByRole("table");
	return within(table).getAllByRole("row").slice(1);
}

beforeEach(() => {
	vi.clearAllMocks();
	clientMock.ranking.get.mockImplementation(
		async ({ period }: { period: RankingPeriod }) =>
			period === "all" ? ALL : ranking(period, [entry(2), entry(0), entry(1)]),
	);
});

describe("RankingBoard", () => {
	it("mostra o podio com os tres primeiros e a tabela com o resto", async () => {
		renderWithClient(<Harness />);

		expect(await tableRows()).toHaveLength(2);
		expect(podiumNames()).toHaveLength(3);
		expect(clientMock.ranking.get.mock.lastCall?.[0]).toStrictEqual({
			period: "all",
		});
	});

	it("troca o periodo, pede a janela certa e mostra o intervalo", async () => {
		renderWithClient(<Harness />);
		await tableRows();

		fireEvent.click(screen.getByRole("button", { name: "Mês" }));

		await waitFor(() => expect(podiumNames()[0]).toContain("Carla Dias"));
		expect(clientMock.ranking.get.mock.lastCall?.[0]).toStrictEqual({
			period: "month",
		});
		expect(screen.getByText(/1 de set\. a 30 de set\./)).toBeInTheDocument();
	});

	it("so oferece trimestre quando o periodo esta liberado", async () => {
		const { unmount } = renderWithClient(<Harness />);
		await tableRows();
		expect(
			screen.queryByRole("button", { name: "Trimestre" }),
		).not.toBeInTheDocument();
		unmount();

		renderWithClient(<Harness periods={RANKING_PERIODS} />);
		expect(
			await screen.findByRole("button", { name: "Trimestre" }),
		).toBeInTheDocument();
	});

	it("destaca a linha de quem esta logado pelo isMe da API", async () => {
		renderWithClient(<Harness />);

		const [diego] = await tableRows();
		expect(within(diego as HTMLElement).getByText("você")).toBeInTheDocument();
	});

	it("resume a posicao de quem esta logado", async () => {
		clientMock.ranking.get.mockResolvedValueOnce({
			...ALL,
			me: { position: 4, points: 70, kpiCount: 2, change: 2 },
		});
		renderWithClient(<Harness />);

		expect(await screen.findByText(/Você está em/)).toHaveTextContent(
			"Você está em 4º com 70 pontos.",
		);
	});

	it("numera a tabela a partir do quarto lugar e mostra a mudanca", async () => {
		renderWithClient(<Harness />);

		const [diego, eva] = await tableRows();
		expect(within(diego as HTMLElement).getByText("04")).toBeInTheDocument();
		expect(
			within(diego as HTMLElement).getByText("posições ganhas"),
		).toBeInTheDocument();
		expect(
			within(eva as HTMLElement).getByText("posições perdidas"),
		).toBeInTheDocument();
	});

	it("change nulo e 'sem comparacao', nao 'nao mudou'", async () => {
		clientMock.ranking.get.mockResolvedValueOnce(
			ranking("all", [entry(0), entry(1), entry(2), entry(3)]),
		);
		renderWithClient(<Harness />);

		const [row] = await tableRows();
		expect(
			within(row as HTMLElement).getByText(
				"Sem comparação com o período anterior",
			),
		).toBeInTheDocument();
	});

	it("avisa quando ninguem pontuou no periodo", async () => {
		clientMock.ranking.get.mockResolvedValueOnce(
			ranking("all", [
				entry(0, { points: 0, kpiCount: 0 }),
				entry(1, { points: 0, kpiCount: 0 }),
			]),
		);
		renderWithClient(<Harness />);

		expect(
			await screen.findByText(/Ninguém recebeu KPI neste período/),
		).toBeInTheDocument();
	});

	it("oferece tentar de novo quando o ranking falha", async () => {
		clientMock.ranking.get.mockRejectedValueOnce(
			new ORPCError("INTERNAL_SERVER_ERROR"),
		);
		renderWithClient(<Harness />);

		fireEvent.click(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		);

		expect(await tableRows()).toHaveLength(2);
	});

	it("sem onOpenMember, nenhum nome vira botao", async () => {
		renderWithClient(<Harness />);
		await tableRows();

		expect(
			screen.queryByRole("button", { name: /Ver perfil de/ }),
		).not.toBeInTheDocument();
	});

	it("com onOpenMember, tabela e podio abrem o perfil", async () => {
		const onOpenMember = vi.fn();
		renderWithClient(<Harness onOpenMember={onOpenMember} />);
		await tableRows();

		fireEvent.click(
			screen.getByRole("button", { name: "Ver perfil de Eva Rocha" }),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Ver perfil de Ana Souza" }),
		);

		expect(onOpenMember.mock.calls.map(([member]) => member.id)).toStrictEqual([
			"m5",
			"m1",
		]);
	});
});

describe("AdminRankingPage", () => {
	it("abre o perfil real do membro clicado", async () => {
		clientMock.profile.getPublicProfile.mockResolvedValue({
			member: { id: "m5", name: "Eva Rocha", position: "Dev", role: "MEMBER" },
			rankingPosition: 5,
			teamSize: 8,
			total: 60,
			categories: {
				presence: 20,
				performance: 20,
				behavior: 10,
				initiative: 10,
			},
			level: {
				level: 0,
				tier: "INICIANTE",
				currentPoints: 60,
				levelFloor: 0,
				nextLevel: 1,
				nextLevelPoints: 100,
				progress: 60,
				nextTier: "INICIANTE",
			},
			kpis: [],
			badges: [],
		});
		renderWithClient(
			<AdminRankingPage period="all" onPeriodChange={() => {}} />,
		);
		await tableRows();

		fireEvent.click(
			screen.getByRole("button", { name: "Ver perfil de Eva Rocha" }),
		);

		expect(
			await screen.findByRole("heading", { name: "Eva Rocha" }),
		).toBeInTheDocument();
		expect(await screen.findByText("#5 no ranking")).toBeInTheDocument();
		expect(screen.getByText("#5 de 8")).toBeInTheDocument();
		expect(
			clientMock.profile.getPublicProfile.mock.lastCall?.[0],
		).toStrictEqual({ id: "m5" });
	});
});
