import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { type Session, syncSessionUser } from "@/lib/auth";
import { orpc } from "@/utils/orpc";

const ME_STALE_TIME = 5 * 60 * 1000;

/**
 * O guard le o snapshot do `localStorage` e renderiza na hora; o `auth.me`
 * confirma em segundo plano. Perfil trocado no banco re-roda os guards.
 */
export function useRevalidatedSession(session: Session): Session {
	const router = useRouter();
	const { data: user } = useQuery(
		orpc.auth.me.queryOptions({ staleTime: ME_STALE_TIME }),
	);

	useEffect(() => {
		if (!user) {
			return;
		}

		const synced = syncSessionUser(user);

		if (synced && synced.role !== session.role) {
			void router.invalidate();
		}
	}, [user, session.role, router]);

	if (!user) {
		return session;
	}

	const { id, ...rest } = user;
	return { userId: id, ...rest };
}
