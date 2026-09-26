import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileHeader } from "@/components/member-profile/profile-header";

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

function renderHeader(level: typeof MID_LEVEL | typeof MAX_LEVEL) {
	render(
		<ProfileHeader
			name="Marina Duarte"
			position="Product Owner Sênior"
			level={level}
			badges={null}
		/>,
	);
}

describe("círculo de nível", () => {
	it("mostra o nível e o percentual até o próximo", () => {
		renderHeader(MID_LEVEL);

		expect(
			screen.getByRole("img", {
				name: "Nível 3, 40% do caminho para o próximo",
			}),
		).toBeInTheDocument();
		expect(screen.queryByText("max")).not.toBeInTheDocument();
	});

	it("no nível máximo mostra max abaixo do número, sem percentual", () => {
		renderHeader(MAX_LEVEL);

		expect(
			screen.getByRole("img", { name: "Nível 20, nível máximo" }),
		).toBeInTheDocument();
		expect(screen.getByText("max")).toBeInTheDocument();
	});
});
