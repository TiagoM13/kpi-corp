import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MEMBER_BY_ID } from "@/mocks/members";
import { MemberDashboardPage } from "@/pages/member/dashboard";
import { renderWithRouter } from "./render-with-router";

function renderDashboard(memberId: string, name = "Bruno Carvalho") {
	return renderWithRouter(
		<MemberDashboardPage memberId={memberId} name={name} />,
		["/ranking"],
	);
}

describe("MemberDashboardPage", () => {
	it("mostra o proprio perfil de quem esta logado", async () => {
		await renderDashboard("u2");

		expect(
			screen.getByRole("heading", { name: "Bruno Carvalho" }),
		).toBeInTheDocument();
		expect(screen.getByText("#2 no ranking")).toBeInTheDocument();
		expect(screen.getByText("nv 6")).toBeInTheDocument();
	});

	it("reusa o mesmo bloco do drawer, com historico e conquistas", async () => {
		await renderDashboard("u2");

		for (const title of [
			"Histórico de KPIs",
			"Distribuição por categoria",
			"Conquistas",
		]) {
			expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
		}
	});

	it("explica a falta de pontuacao para quem nao esta no time", async () => {
		await renderDashboard("convidado-novo", "Novo Membro");

		expect(
			screen.getByText("Novo, você ainda não tem pontuação"),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /Ver o ranking/ })).toHaveAttribute(
			"href",
			"/ranking?periodo=geral",
		);
	});

	it("nao renderiza o perfil quando o membro nao existe", async () => {
		await renderDashboard("convidado-novo", "Novo Membro");

		expect(
			screen.queryByRole("heading", { name: "Histórico de KPIs" }),
		).not.toBeInTheDocument();
		expect(MEMBER_BY_ID.get("convidado-novo")).toBeUndefined();
	});
});
