import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Componentes que usam `<Link>` precisam do contexto do router. Em vez do
 * routeTree gerado (que arrasta guards e redirects de toda a app), monta uma
 * arvore minima com o componente na raiz e as rotas de destino vazias.
 */
export async function renderWithRouter(
	ui: ReactNode,
	paths: string[] = ["/login"],
) {
	const rootRoute = createRootRoute();

	const indexRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: () => <>{ui}</>,
	});

	const targetRoutes = paths.map((path) =>
		createRoute({
			getParentRoute: () => rootRoute,
			path,
			component: () => null,
		}),
	);

	const router = createRouter({
		routeTree: rootRoute.addChildren([indexRoute, ...targetRoutes]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});

	// Sem o load inicial o primeiro render sai vazio: o router ainda nao casou
	// a rota "/" com a arvore.
	await router.load();

	// A app registra o router real em `Register`, entao um router de teste com
	// outra arvore nao bate no tipo de RouterProvider.
	return render(<RouterProvider router={router as never} />);
}
