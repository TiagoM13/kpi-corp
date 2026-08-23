import { Button } from "@kpi-corp/ui/components/button";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("test setup", () => {
	it("renders a shared UI primitive", () => {
		render(<Button>Entrar</Button>);

		expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
	});
});
