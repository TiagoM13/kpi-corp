import { type Session, startSession } from "@/lib/auth";
import { findMockInvite, INVITE_TTL_HOURS } from "@/mocks/invites";

export type InviteStatus = "VALID" | "EXPIRED" | "USED" | "INVALID";

export type InviteValidation =
	| { status: "VALID"; email: string }
	| { status: Exclude<InviteStatus, "VALID"> };

const BURNED_KEY = "kpicorp.mock-invites-used";

function burnedTokens(): string[] {
	try {
		const raw = localStorage.getItem(BURNED_KEY);
		return raw ? (JSON.parse(raw) as string[]) : [];
	} catch {
		return [];
	}
}

function burnToken(token: string) {
	try {
		localStorage.setItem(
			BURNED_KEY,
			JSON.stringify([...burnedTokens(), token]),
		);
	} catch {
		return;
	}
}

export function validateInvite(token: string): InviteValidation {
	const invite = findMockInvite(token);

	if (!invite) {
		return { status: "INVALID" };
	}

	if (invite.usedAt !== null || burnedTokens().includes(invite.token)) {
		return { status: "USED" };
	}

	if (invite.expiresAt <= Date.now()) {
		return { status: "EXPIRED" };
	}

	return { status: "VALID", email: invite.email };
}

export const INVITE_ERROR: Record<
	Exclude<InviteStatus, "VALID">,
	{ title: string; description: string }
> = {
	EXPIRED: {
		title: "Este convite expirou",
		description: `Convites valem ${INVITE_TTL_HOURS} horas. Peça um novo link para quem te convidou.`,
	},
	USED: {
		title: "Este convite já foi usado",
		description:
			"A conta deste link já existe. Entre com seu e-mail e senha, ou peça um novo convite.",
	},
	INVALID: {
		title: "Link inválido",
		description:
			"Confira se o endereço veio completo do e-mail. Se o problema continuar, peça um novo convite.",
	},
};

export class InvalidInviteError extends Error {
	readonly status: Exclude<InviteStatus, "VALID">;

	constructor(status: Exclude<InviteStatus, "VALID">) {
		super(INVITE_ERROR[status].title);
		this.name = "InvalidInviteError";
		this.status = status;
	}
}

export type AcceptInviteInput = {
	token: string;
	name: string;
	position: string;
	password: string;
};

function hueFromEmail(email: string): number {
	let hash = 0;
	for (const char of email) {
		hash = (hash * 31 + char.charCodeAt(0)) % 360;
	}
	return hash;
}

export function acceptInvite(input: AcceptInviteInput): Session {
	const validation = validateInvite(input.token);

	if (validation.status !== "VALID") {
		throw new InvalidInviteError(validation.status);
	}

	const session: Session = {
		userId: `invite-${input.token}`,
		name: input.name.trim(),
		email: validation.email,
		position: input.position.trim(),
		role: "MEMBER",
		hue: hueFromEmail(validation.email),
	};

	burnToken(input.token);

	return startSession(session);
}
