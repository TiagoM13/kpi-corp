import { domainCodeOf, type Session, startSession } from "@/lib/auth";
import { client } from "@/utils/orpc";

export const INVITE_TTL_HOURS = 48;

export type InviteStatus = "VALID" | "EXPIRED" | "USED" | "INVALID";

type RefusedStatus = Exclude<InviteStatus, "VALID">;

export type InviteValidation =
	| { status: "VALID"; email: string }
	| { status: RefusedStatus };

export function validateInvite(token: string): Promise<InviteValidation> {
	return client.auth.validateInvite({ token });
}

export const INVITE_ERROR: Record<
	RefusedStatus,
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

const REFUSAL_BY_CODE: Record<string, RefusedStatus> = {
	INVALID_INVITATION: "INVALID",
	INVITATION_EXPIRED: "EXPIRED",
	INVITATION_ALREADY_USED: "USED",
	EMAIL_ALREADY_REGISTERED: "USED",
};

export class InvalidInviteError extends Error {
	readonly status: RefusedStatus;

	constructor(status: RefusedStatus) {
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

export async function acceptInvite(input: AcceptInviteInput): Promise<Session> {
	try {
		const response = await client.auth.register({
			token: input.token,
			name: input.name.trim(),
			position: input.position.trim() || undefined,
			password: input.password,
		});

		return startSession(response);
	} catch (error) {
		const refusal = REFUSAL_BY_CODE[domainCodeOf(error) ?? ""];

		if (refusal) {
			throw new InvalidInviteError(refusal);
		}

		throw error;
	}
}
