import { createFileRoute, redirect } from "@tanstack/react-router";

import { getSession, homeRouteFor } from "@/lib/auth";
import { LoginPage } from "@/pages/login";

export const Route = createFileRoute("/login")({
	beforeLoad: () => {
		// Ja autenticado nao volta para o login.
		const session = getSession();
		if (session) {
			throw redirect({ to: homeRouteFor(session.role) });
		}
	},
	component: LoginPage,
});
