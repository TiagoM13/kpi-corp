import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { RankingBoard } from "@/components/ranking";
import { type RankingPeriod, rankingFor } from "@/lib/ranking";
import type { Member } from "@/mocks/members";

function Harness({
	highlightMemberId,
	onOpenMember,
}: {
	highlightMemberId?: string;
	onOpenMember?: (member: Member) => void;
}) {
	const [period, setPeriod] = useState<RankingPeriod>("all");

	return (
		<RankingBoard
			period={period}
			onPeriodChange={setPeriod}
			highlightMemberId={highlightMemberId}
			onOpenMember={onOpenMember}
		/>
	);
}

function podium() {
	return screen.getByRole("list", { name: undefined, hidden: false });
}

function podiumNames() {
	const section = screen.getByRole("region", { name: "Pódio" });
	return within(section)
		.getAllByRole("listitem")
		.map((item) => item.textContent ?? "");
}

describe("RankingBoard", () => {
	it("mostra o podio com os tres primeiros e a tabela com o resto", () => {
		render(<Harness />);

		expect(podium()).toBeInTheDocument();
		expect(podiumNames()).toHaveLength(3);

		const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
		expect(rows).toHaveLength(rankingFor("all").length - 3);
	});

	it("troca o periodo e reordena o podio", async () => {
		render(<Harness />);

		expect(podiumNames()[0]).toContain("Ana Beatriz Souza");

		fireEvent.click(screen.getByRole("button", { name: "Semana" }));

		await waitFor(() => expect(podiumNames()[0]).toContain("Carla Menezes"));
	});

	it("destaca a linha do usuario logado", () => {
		render(<Harness highlightMemberId="u9" />);

		const row = screen.getByText("Isabela Moraes").closest("tr");
		expect(row).not.toBeNull();
		expect(within(row as HTMLElement).getByText("você")).toBeInTheDocument();
	});

	it("sem onOpenMember, nenhum nome vira botao", () => {
		render(<Harness />);

		expect(
			screen.queryByRole("button", { name: /Ver perfil de/ }),
		).not.toBeInTheDocument();
	});

	it("com onOpenMember, o nome abre o perfil", () => {
		const onOpenMember = vi.fn();
		render(<Harness onOpenMember={onOpenMember} />);

		fireEvent.click(
			screen.getByRole("button", { name: "Ver perfil de Felipe Rocha" }),
		);

		expect(onOpenMember).toHaveBeenCalledTimes(1);
		expect(onOpenMember.mock.calls[0]?.[0]).toMatchObject({ id: "u6" });
	});

	it("o podio tambem abre o perfil quando o callback existe", () => {
		const onOpenMember = vi.fn();
		render(<Harness onOpenMember={onOpenMember} />);

		fireEvent.click(
			screen.getByRole("button", { name: "Ver perfil de Ana Beatriz Souza" }),
		);

		expect(onOpenMember).toHaveBeenCalledTimes(1);
	});

	it("numera a tabela a partir do quarto lugar", () => {
		render(<Harness />);

		const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
		const first = rows[0];
		if (!first) throw new Error("tabela vazia");

		expect(within(first).getByText("04")).toBeInTheDocument();
	});
});
