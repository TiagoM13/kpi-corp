const STORAGE_KEY = "kpicorp.session";

export type Role = "ADMIN" | "MEMBER";

export type SessionUser = {
	userId: string;
	name: string;
	email: string;
	position: string | null;
	role: Role;
};

export type StoredSession = {
	accessToken: string;
	refreshToken: string;
	user: SessionUser;
};

type Listener = () => void;

const clearListeners = new Set<Listener>();

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSessionUser(value: unknown): value is SessionUser {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.userId === "string" &&
		typeof value.name === "string" &&
		typeof value.email === "string" &&
		(typeof value.position === "string" || value.position === null) &&
		(value.role === "ADMIN" || value.role === "MEMBER")
	);
}

function isStoredSession(value: unknown): value is StoredSession {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.accessToken === "string" &&
		value.accessToken.length > 0 &&
		typeof value.refreshToken === "string" &&
		value.refreshToken.length > 0 &&
		isSessionUser(value.user)
	);
}

/** Leitura sincrona: os guards de rota rodam antes de qualquer render. */
export function readStoredSession(): StoredSession | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return null;
		}

		const parsed: unknown = JSON.parse(raw);

		return isStoredSession(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

export function writeStoredSession(session: StoredSession) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
	} catch {
		return;
	}
}

export function clearStoredSession() {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// nada a limpar
	}

	for (const listener of clearListeners) {
		listener();
	}
}

export function onSessionCleared(listener: Listener): () => void {
	clearListeners.add(listener);

	return () => {
		clearListeners.delete(listener);
	};
}
