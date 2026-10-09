import { compare, hash } from "bcryptjs";

const DEFAULT_COST = 12;

/**
 * Valid bcrypt hash of an unreachable password, used to keep login response
 * time constant when the email does not exist. It must be a real hash: an
 * invalid one is rejected by bcrypt before any work is done, which would leak
 * the account's existence through timing.
 */
export const DUMMY_PASSWORD_HASH =
	"$2b$12$jwTYj/dvu6GNcQB3Eax0dOOwN/SlHTDJoBjDtcYOkhsTX/ZmXNo6K";

export async function hashPassword(password: string): Promise<string> {
	return hash(password, DEFAULT_COST);
}

export async function verifyPassword(
	password: string,
	passwordHash: string,
): Promise<boolean> {
	return compare(password, passwordHash);
}
