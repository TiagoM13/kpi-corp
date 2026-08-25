// Sessao mock, so no cliente. Nao ha token, nao ha API, nao ha expiracao real.
// Existe para dar navegacao ao protótipo e sera trocada por cookie httpOnly
// quando `auth.login` existir no backend.

import { findMockUser, MOCK_PASSWORD, type MockUser } from "@/mocks/users";

const STORAGE_KEY = "kpicorp.mock-session";

export type Session = Omit<MockUser, "id"> & { userId: string };

export class InvalidCredentialsError extends Error {
	constructor() {
		super("E-mail ou senha incorretos.");
		this.name = "InvalidCredentialsError";
	}
}

/** Leitura sincrona: os guards de rota rodam antes de qualquer render. */
export function getSession(): Session | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Session) : null;
	} catch {
		// localStorage indisponivel (modo privado, cookies bloqueados)
		return null;
	}
}

export function signIn(email: string, password: string): Session {
	const user = findMockUser(email);

	// Mensagem unica para e-mail inexistente e senha errada: nao revela
	// quais e-mails estao cadastrados.
	if (!user || password !== MOCK_PASSWORD) {
		throw new InvalidCredentialsError();
	}

	const { id, ...rest } = user;

	return startSession({ userId: id, ...rest });
}

export function startSession(session: Session): Session {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
	} catch {
		// sessao so em memoria nesta aba
	}

	return session;
}

export function signOut() {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// nada a limpar
	}
}

/** Rota inicial de cada perfil. Admin tem area propria; membro usa as rotas normais. */
export function homeRouteFor(role: Session["role"]): "/admin" | "/dashboard" {
	return role === "ADMIN" ? "/admin" : "/dashboard";
}
