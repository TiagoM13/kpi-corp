import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MemberDetail } from "@/components/member-detail";
import { MEMBER_BY_ID, type Member } from "@/mocks/members";

function memberById(id: string): Member {
	const member = MEMBER_BY_ID.get(id);
	if (!member) throw new Error(`membro ${id} nao existe no mock`);
	return member;
}

afterEach(() => {
	vi.useRealTimers();
});

describe("MemberDetail", () => {
	it("mostra identidade, posicao no ranking e progresso do nivel", () => {
		render(<MemberDetail member={memberById("u1")} />);

		expect(
			screen.getByRole("heading", { name: "Ana Beatriz Souza" }),
		).toBeInTheDocument();
		expect(screen.getByText("#1 no ranking")).toBeInTheDocument();
		expect(screen.getByText("nv 7")).toBeInTheDocument();
		expect(screen.getByText("90 / 450 pts")).toBeInTheDocument();
		expect(screen.getByText("Faltam 360 pontos.")).toBeInTheDocument();
		expect(screen.getByText(/Entrou em abril de 2023/)).toBeInTheDocument();
	});

	it("lista o historico de KPIs de quem tem atribuicao", () => {
		render(<MemberDetail member={memberById("u3")} />);

		expect(screen.getByText("3 entradas")).toBeInTheDocument();
		expect(screen.getByText("Boa ideia em reunião")).toBeInTheDocument();
		expect(screen.getByText("Documentou processo")).toBeInTheDocument();
	});

	it("explica o historico vazio em vez de mostrar lista vazia", () => {
		render(<MemberDetail member={memberById("u9")} />);

		expect(screen.getByText("0 entradas")).toBeInTheDocument();
		expect(screen.getByText("Nenhuma atribuição ainda")).toBeInTheDocument();
	});

	it("nao mostra chip de sequencia para quem esta zerado", () => {
		render(<MemberDetail member={memberById("u9")} />);

		expect(screen.queryByLabelText(/Sequência de/)).not.toBeInTheDocument();
	});

	it("mostra tooltip com nome e descricao ao pairar numa conquista", () => {
		vi.useFakeTimers();
		render(<MemberDetail member={memberById("u1")} />);

		const cell = screen.getByText("Primeira pontuação").closest("li");
		if (!cell) throw new Error("celula da conquista nao encontrada");

		fireEvent.mouseEnter(cell);
		fireEvent.mouseMove(cell);
		act(() => {
			vi.advanceTimersByTime(200);
		});

		expect(
			screen.getByText("Conquistou seu primeiro KPI."),
		).toBeInTheDocument();
	});

	it("marca a conquista bloqueada na tooltip", () => {
		vi.useFakeTimers();
		render(<MemberDetail member={memberById("u1")} />);

		const cell = screen.getByText(/Caçador de bugs/).closest("li");
		if (!cell) throw new Error("celula da conquista nao encontrada");

		fireEvent.mouseEnter(cell);
		fireEvent.mouseMove(cell);
		act(() => {
			vi.advanceTimersByTime(200);
		});

		expect(screen.getAllByText("Caçador de bugs (bloqueada)")).toHaveLength(2);
	});
});
