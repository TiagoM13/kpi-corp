export const INVITE_TTL_HOURS = 48;

export const VALID_TOKEN = "convite-valido";
export const EXPIRED_TOKEN = "convite-expirado";
export const USED_TOKEN = "convite-usado";

export const INVITED_EMAIL = "novo.membro@kpicorp.io";

export type MockInvite = {
	token: string;
	email: string;
	expiresAt: number;
	usedAt: number | null;
};

const HOUR = 60 * 60 * 1000;

const loadedAt = Date.now();

export const MOCK_INVITES: MockInvite[] = [
	{
		token: VALID_TOKEN,
		email: INVITED_EMAIL,
		expiresAt: loadedAt + INVITE_TTL_HOURS * HOUR,
		usedAt: null,
	},
	{
		token: EXPIRED_TOKEN,
		email: "atrasado@kpicorp.io",
		expiresAt: loadedAt - HOUR,
		usedAt: null,
	},
	{
		token: USED_TOKEN,
		email: "ja.entrou@kpicorp.io",
		expiresAt: loadedAt + INVITE_TTL_HOURS * HOUR,
		usedAt: loadedAt - HOUR,
	},
];

export function findMockInvite(token: string) {
	return MOCK_INVITES.find((invite) => invite.token === token.trim());
}
