import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useKpiStore } from "@/lib/kpi-store";
import { MOCK_KPIS } from "@/mocks/kpis";
import { MOCK_MEMBERS } from "@/mocks/members";
import { AdminMeetingPage } from "@/pages/admin/meeting";

beforeEach(() => {
	localStorage.clear();
	useKpiStore.setState({ kpis: MOCK_KPIS });
});

function renderMeeting(onExit = vi.fn()) {
	render(<AdminMeetingPage onExit={onExit} />);
	return onExit;
}

function startWith(names: string[]) {
	for (const name of names) {
		fireEvent.click(screen.getByRole("button", { name: new RegExp(name) }));
	}
	fireEvent.click(screen.getByRole("button", { name: "Iniciar reunião" }));
}

describe("AdminMeetingPage — setup", () => {
	it("lista o time e começa com o botão desabilitado", () => {
		renderMeeting();

		expect(
			screen.getByText("Passo 1 de 2 · Marque os presentes"),
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Iniciar reunião" }),
		).toBeDisabled();
		const counter = screen.getByText(`de ${MOCK_MEMBERS.length} marcados`, {
			exact: false,
		});
		expect(counter).toHaveTextContent(`0 de ${MOCK_MEMBERS.length} marcados`);
	});

	it("marca todos e limpa", () => {
		renderMeeting();

		fireEvent.click(screen.getByRole("button", { name: "Marcar todos" }));
		expect(
			screen.getByRole("button", { name: "Iniciar reunião" }),
		).toBeEnabled();

		fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
		expect(
			screen.getByRole("button", { name: "Iniciar reunião" }),
		).toBeDisabled();
	});

	it("aceita renomear a reunião", () => {
		renderMeeting();

		const input = screen.getByLabelText("Título da reunião");
		fireEvent.change(input, { target: { value: "Retro da sprint" } });

		expect(input).toHaveValue("Retro da sprint");
	});
});

describe("AdminMeetingPage — ao vivo", () => {
	it("dá presença para cada marcado ao iniciar", async () => {
		renderMeeting();
		startWith(["Ana Beatriz Souza", "Bruno Carvalho"]);

		expect(await screen.findByText("Ao vivo")).toBeVisible();
		expect(screen.getByText("Reconhecimentos").nextSibling).toHaveTextContent(
			"2",
		);
	});

	it("só atribui depois de escolher o KPI", async () => {
		renderMeeting();
		startWith(["Ana Beatriz Souza"]);

		const card = await screen.findByRole("button", {
			name: /Ana Beatriz Souza, 5 pontos/,
		});
		expect(card).toBeDisabled();

		fireEvent.click(
			screen.getByRole("button", { name: /Boa ideia em reunião/ }),
		);

		const armed = await screen.findByRole("button", {
			name: "Dar Boa ideia em reunião para Ana Beatriz Souza",
		});
		fireEvent.click(armed);

		await waitFor(() =>
			expect(screen.getByText("Reconhecimentos").nextSibling).toHaveTextContent(
				"2",
			),
		);
	});

	it("desfaz a última atribuição", async () => {
		renderMeeting();
		startWith(["Ana Beatriz Souza"]);

		fireEvent.click(
			screen.getByRole("button", { name: /Boa ideia em reunião/ }),
		);
		fireEvent.click(
			await screen.findByRole("button", {
				name: "Dar Boa ideia em reunião para Ana Beatriz Souza",
			}),
		);

		fireEvent.click(screen.getByRole("button", { name: /Desfazer/ }));

		await waitFor(() =>
			expect(screen.getByText("Reconhecimentos").nextSibling).toHaveTextContent(
				"1",
			),
		);
	});

	it("anuncia a atribuição para leitor de tela", async () => {
		renderMeeting();
		startWith(["Ana Beatriz Souza"]);

		fireEvent.click(
			screen.getByRole("button", { name: /Boa ideia em reunião/ }),
		);
		fireEvent.click(
			await screen.findByRole("button", {
				name: "Dar Boa ideia em reunião para Ana Beatriz Souza",
			}),
		);

		expect(
			await screen.findByText(/Ana Beatriz Souza ganhou Boa ideia em reunião/),
		).toBeInTheDocument();
	});

	it("pede confirmação para sair no meio", async () => {
		const onExit = renderMeeting();
		startWith(["Ana Beatriz Souza"]);
		await screen.findByText("Ao vivo");

		const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
		fireEvent.click(
			screen.getByRole("button", { name: "Sair do modo reunião" }),
		);

		expect(confirm).toHaveBeenCalledTimes(1);
		expect(onExit).not.toHaveBeenCalled();

		confirm.mockReturnValue(true);
		fireEvent.click(
			screen.getByRole("button", { name: "Sair do modo reunião" }),
		);
		expect(onExit).toHaveBeenCalledTimes(1);

		confirm.mockRestore();
	});
});

describe("AdminMeetingPage — encerrada", () => {
	it("mostra o resumo com pódio e avisa que nada foi gravado", async () => {
		renderMeeting();
		startWith(["Ana Beatriz Souza", "Bruno Carvalho"]);

		fireEvent.click(screen.getByRole("button", { name: "Encerrar reunião" }));

		expect(await screen.findByText("Reunião encerrada.")).toBeVisible();
		expect(screen.getByText(/2 atribuições, 10 pontos no total/)).toBeVisible();
		expect(screen.getByText(/ainda não é gravado/)).toBeVisible();

		const podium = screen.getByRole("list", { name: undefined });
		expect(within(podium).getAllByRole("listitem")).toHaveLength(2);
	});

	it("nova reunião volta para o setup", async () => {
		renderMeeting();
		startWith(["Ana Beatriz Souza"]);
		fireEvent.click(screen.getByRole("button", { name: "Encerrar reunião" }));
		await screen.findByText("Reunião encerrada.");

		fireEvent.click(screen.getByRole("button", { name: /Nova reunião/ }));

		expect(
			await screen.findByText("Passo 1 de 2 · Marque os presentes"),
		).toBeVisible();
	});

	it("sair da tela final não pede confirmação", async () => {
		const onExit = renderMeeting();
		startWith(["Ana Beatriz Souza"]);
		fireEvent.click(screen.getByRole("button", { name: "Encerrar reunião" }));
		await screen.findByText("Reunião encerrada.");

		fireEvent.click(screen.getByRole("button", { name: "Voltar ao painel" }));
		expect(onExit).toHaveBeenCalledTimes(1);
	});
});
