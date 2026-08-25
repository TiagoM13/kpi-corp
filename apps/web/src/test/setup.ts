import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom nao implementa scrollTo e o RouterProvider chama em toda navegacao.
// Sem o stub, todo teste que monta um router polui a saida com "Not implemented".
vi.stubGlobal("scrollTo", vi.fn());

afterEach(() => {
	cleanup();
});
