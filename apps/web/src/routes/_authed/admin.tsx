import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/admin")({
	beforeLoad: ({ context }) => {
		// O perfil vem da sessao, nunca de escolha do usuario na tela.
		if (context.session.role !== "ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: Outlet,
});
