import { describe, expect, it } from "vitest";

import {
	generateAccessToken,
	generateRefreshTokenPayload,
	generateTokenId,
	hashToken,
	verifyAccessToken,
	verifyRefreshToken,
	verifyTokenHash,
} from "../../../modules/auth/auth.tokens";

describe("auth tokens", () => {
	const mockUser = {
		id: "b29f5637-0ab1-4de0-b2d2-d364e3903124",
		name: "Admin",
		email: "admin@kpicorp.com",
		role: "ADMIN" as const,
		position: null,
		active: true,
	};

	describe("generateAccessToken / verifyAccessToken", () => {
		it("should generate a verifiable access token", async () => {
			const token = await generateAccessToken(mockUser);

			expect(token).toBeDefined();
			expect(typeof token).toBe("string");

			const payload = await verifyAccessToken(token);

			expect(payload.sub).toBe(mockUser.id);
			expect(payload.email).toBe(mockUser.email);
			expect(payload.role).toBe(mockUser.role);
		});

		it("should reject an invalid access token", async () => {
			await expect(verifyAccessToken("invalid-token")).rejects.toThrow();
		});
	});

	describe("generateRefreshTokenPayload / verifyRefreshToken", () => {
		it("should generate a verifiable refresh token", async () => {
			const token = await generateRefreshTokenPayload(mockUser, "token-id-123");

			expect(token).toBeDefined();
			expect(typeof token).toBe("string");

			const payload = await verifyRefreshToken(token);

			expect(payload.sub).toBe(mockUser.id);
			expect(payload.tokenId).toBe("token-id-123");
		});

		it("should reject a refresh token signed with the access secret", async () => {
			const accessToken = await generateAccessToken(mockUser);

			await expect(verifyRefreshToken(accessToken)).rejects.toThrow();
		});
	});

	describe("hashToken / verifyTokenHash", () => {
		it("should produce a sha256 digest", () => {
			const digest = hashToken("some-token");

			expect(digest).toMatch(/^[0-9a-f]{64}$/);
			expect(hashToken("some-token")).toBe(digest);
		});

		it("should distinguish two refresh tokens of the same user", async () => {
			const first = await generateRefreshTokenPayload(
				mockUser,
				generateTokenId(),
			);
			const second = await generateRefreshTokenPayload(
				mockUser,
				generateTokenId(),
			);

			// bcrypt truncates at 72 bytes, where these two tokens are still
			// identical, so it would hash them the same. sha256 must not.
			expect(first.slice(0, 72)).toBe(second.slice(0, 72));
			expect(hashToken(first)).not.toBe(hashToken(second));
			expect(verifyTokenHash(first, hashToken(second))).toBe(false);
		});

		it("should match a token against its own hash", () => {
			const token = "a-refresh-token";

			expect(verifyTokenHash(token, hashToken(token))).toBe(true);
		});

		it("should return false for a malformed stored hash", () => {
			expect(verifyTokenHash("a-refresh-token", "not-a-hash")).toBe(false);
		});
	});
});
