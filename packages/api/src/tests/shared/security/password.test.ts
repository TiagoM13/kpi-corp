import { describe, expect, it } from "vitest";

import {
	DUMMY_PASSWORD_HASH,
	hashPassword,
	verifyPassword,
} from "../../../shared/security/password";

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

describe("password security", () => {
	describe("hashPassword", () => {
		it("should hash a password", async () => {
			const hash = await hashPassword("password123");

			expect(hash).toBeDefined();
			expect(hash).not.toBe("password123");
			expect(hash).toMatch(BCRYPT_HASH);
		});
	});

	describe("verifyPassword", () => {
		it("should return true for matching password", async () => {
			const hash = await hashPassword("password123");
			const result = await verifyPassword("password123", hash);

			expect(result).toBe(true);
		});

		it("should return false for non-matching password", async () => {
			const hash = await hashPassword("password123");
			const result = await verifyPassword("wrongpassword", hash);

			expect(result).toBe(false);
		});
	});

	describe("DUMMY_PASSWORD_HASH", () => {
		it("should be a well-formed bcrypt hash", () => {
			// A malformed hash is rejected before any work is done, which turns the
			// constant-time login path back into a timing oracle.
			expect(DUMMY_PASSWORD_HASH).toMatch(BCRYPT_HASH);
		});

		it("should cost real work to verify against", async () => {
			const startedAt = performance.now();
			const result = await verifyPassword("anything", DUMMY_PASSWORD_HASH);
			const elapsed = performance.now() - startedAt;

			expect(result).toBe(false);
			expect(elapsed).toBeGreaterThan(10);
		});
	});
});
