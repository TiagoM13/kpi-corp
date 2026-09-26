import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LevelProgress } from "@/components/member-profile/level-progress";

const MID_LEVEL = {
	level: 3,
	tier: "INICIANTE" as const,
	currentPoints: 340,
	levelFloor: 300,
	nextLevel: 4,
	nextLevelPoints: 400,
	progress: 40,
	nextTier: "INICIANTE" as const,
};

const MAX_LEVEL = {
	level: 20,
	tier: "LENDA" as const,
	currentPoints: 7850,
	levelFloor: 7500,
	nextLevel: null,
	nextLevelPoints: null,
	progress: 100,
	nextTier: null,
};

describe("LevelProgress", () => {
	it("mostra a barra de progresso rumo ao proximo nivel", () => {
		render(<LevelProgress level={MID_LEVEL} />);

		expect(
			screen.getByRole("progressbar", { name: "Progresso para o nível 4" }),
		).toHaveAttribute("aria-valuenow", "40");
		expect(screen.getByText("Faltam 60 pontos.")).toBeInTheDocument();
	});

	it("troca a barra pela faixa de nivel maximo, sem repetir o nivel", () => {
		render(<LevelProgress level={MAX_LEVEL} />);

		expect(
			screen.getByRole("heading", { name: "Nível máximo atingido" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		expect(screen.queryByText(/20/)).not.toBeInTheDocument();
	});
});
