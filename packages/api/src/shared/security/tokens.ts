import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

const textEncoder = new TextEncoder();

export async function signToken(
	payload: Record<string, unknown>,
	secret: string,
	expiresIn: string,
): Promise<string> {
	return new SignJWT(payload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(expiresIn)
		.sign(textEncoder.encode(secret));
}

export async function verifyToken<T extends Record<string, unknown>>(
	token: string,
	secret: string,
): Promise<T> {
	const { payload } = await jwtVerify(token, textEncoder.encode(secret), {
		algorithms: ["HS256"],
	});

	return payload as unknown as T;
}

export function hashOpaqueToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

export function generateOpaqueToken(bytes = 32): string {
	return randomBytes(bytes).toString("base64url");
}

export function tokenHashMatches(token: string, storedHash: string): boolean {
	const candidate = Buffer.from(hashOpaqueToken(token), "hex");
	const stored = Buffer.from(storedHash, "hex");

	if (candidate.length !== stored.length) {
		return false;
	}

	return timingSafeEqual(candidate, stored);
}

const DURATION_UNITS_IN_MS: Record<string, number> = {
	s: 1000,
	m: 60 * 1000,
	h: 60 * 60 * 1000,
	d: 24 * 60 * 60 * 1000,
};

export function durationToMs(duration: string): number {
	const match = /^(\d+)\s*(s|m|h|d)$/.exec(duration.trim());
	const amount = match?.[1];
	const unit = match?.[2];

	if (!amount || !unit) {
		throw new Error(`Invalid duration: ${duration}`);
	}

	const unitInMs = DURATION_UNITS_IN_MS[unit];

	if (!unitInMs) {
		throw new Error(`Invalid duration unit: ${unit}`);
	}

	return Number(amount) * unitInMs;
}
