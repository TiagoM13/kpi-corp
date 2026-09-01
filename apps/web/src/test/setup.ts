import "@testing-library/jest-dom/vitest";

import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom nao implementa scrollTo e o RouterProvider chama em toda navegacao.
// Sem o stub, todo teste que monta um router polui a saida com "Not implemented".
vi.stubGlobal("scrollTo", vi.fn());

// Overlay do Base UI monta em portal, de forma assincrona. O padrao de 1s do
// findBy* estoura quando a maquina esta carregada (dev server no ar, por
// exemplo) e derruba os testes de dialog e drawer sem que nada esteja quebrado.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
	cleanup();
});
