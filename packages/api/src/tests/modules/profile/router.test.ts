import { createProcedureClient, ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BADGE_CATALOG } from "../../../modules/profile/profile.badges";
import { profileRouter } from "../../../modules/profile/profile.router";
import type { Context } from "../../../shared/context";

const { serviceMock } = vi.hoisted(() => ({
	serviceMock: {
		getMyScore: vi.fn(),
		getMyKpis: vi.fn(),
		getMySummary: vi.fn(),
		getMyBadges: vi.fn(),
		getMyProfile: vi.fn(),
		getPublicProfile: vi.fn(),
	},
}));

vi.mock("../../../modules/profile/profile.service", () => ({
	profileService: serviceMock,
}));

const MEMBER_ID = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";
const OTHER_ID = "8b170793-0516-445d-8cfd-edad0bed45e9";

const anonymous: Context = { headers: {}, auth: null };
const asMember: Context = {
	headers: {},
	auth: { userId: MEMBER_ID, email: "ana@kpicorp.com", role: "MEMBER" },
};
const asAdmin: Context = {
	headers: {},
	auth: {
		userId: "b29f5637-0ab1-4de0-b2d2-d364e3903124",
		email: "admin@kpicorp.com",
		role: "ADMIN",
	},
};

const zeros = { presence: 0, performance: 0, behavior: 0, initiative: 0 };

const level = {
	level: 0,
	tier: "INICIANTE" as const,
	currentPoints: 0,
	levelFloor: 0,
	nextLevel: 1,
	nextLevelPoints: 100,
	progress: 0,
	nextTier: "INICIANTE" as const,
};

const score = { total: 0, categories: zeros, level };
const kpis = { items: [] };
const summary = {
	totalCount: 0,
	countByCategory: zeros,
	scoreByCategory: zeros,
	lastAssignment: null,
};
const badges = BADGE_CATALOG.map((badge) => {
	const earned = badge.code === "FIRST_POINT";

	return {
		...badge,
		earned,
		earnedAt: earned ? new Date("2026-03-02T12:00:00.000Z") : null,
		current: earned ? 1 : 0,
		progress: earned ? 100 : 0,
	};
});
const myProfile = {
	member: {
		id: MEMBER_ID,
		name: "Ana Souza",
		position: null,
		role: "MEMBER" as const,
		email: "ana@kpicorp.com",
		active: true,
		createdAt: new Date(),
	},
	total: 0,
	categories: zeros,
	level,
	kpis: [],
	badges,
};
const publicProfile = {
	member: { id: OTHER_ID, name: "Bruno Lima", position: null, role: "MEMBER" },
	rankingPosition: 3,
	teamSize: 12,
	total: 0,
	categories: zeros,
	level,
	kpis: [],
	badges,
};

function caller(context: Context) {
	return {
		getMyScore: createProcedureClient(profileRouter.getMyScore, { context }),
		getMyKpis: createProcedureClient(profileRouter.getMyKpis, { context }),
		getMySummary: createProcedureClient(profileRouter.getMySummary, {
			context,
		}),
		getMyProfile: createProcedureClient(profileRouter.getMyProfile, {
			context,
		}),
		getPublicProfile: createProcedureClient(profileRouter.getPublicProfile, {
			context,
		}),
	};
}

async function codeOf(call: Promise<unknown>) {
	const error = await call.catch((err: unknown) => err);

	expect(error).toBeInstanceOf(ORPCError);

	return (error as ORPCError<string, unknown>).code;
}

describe("profile router", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		serviceMock.getMyScore.mockResolvedValue(score);
		serviceMock.getMyKpis.mockResolvedValue(kpis);
		serviceMock.getMySummary.mockResolvedValue(summary);
		serviceMock.getMyProfile.mockResolvedValue(myProfile);
		serviceMock.getPublicProfile.mockResolvedValue(publicProfile);
	});

	describe("authorization", () => {
		it("rejects an anonymous request on every route", async () => {
			const c = caller(anonymous);

			expect(await codeOf(c.getMyScore())).toBe("UNAUTHORIZED");
			expect(await codeOf(c.getMyKpis({}))).toBe("UNAUTHORIZED");
			expect(await codeOf(c.getMySummary())).toBe("UNAUTHORIZED");
			expect(await codeOf(c.getMyProfile())).toBe("UNAUTHORIZED");
			expect(await codeOf(c.getPublicProfile({ id: OTHER_ID }))).toBe(
				"UNAUTHORIZED",
			);
		});

		it("does not reach the service for an anonymous request", async () => {
			await caller(anonymous)
				.getMyScore()
				.catch(() => {});

			expect(serviceMock.getMyScore).not.toHaveBeenCalled();
		});

		it("lets a member through on the /me routes", async () => {
			const c = caller(asMember);

			await c.getMyScore();
			await c.getMyKpis({});
			await c.getMySummary();
			await c.getMyProfile();

			expect(serviceMock.getMyScore).toHaveBeenCalledTimes(1);
			expect(serviceMock.getMyKpis).toHaveBeenCalledTimes(1);
			expect(serviceMock.getMySummary).toHaveBeenCalledTimes(1);
			expect(serviceMock.getMyProfile).toHaveBeenCalledTimes(1);
		});

		it("lets a member read another member's public profile", async () => {
			await caller(asMember).getPublicProfile({ id: OTHER_ID });

			expect(serviceMock.getPublicProfile).toHaveBeenCalledWith(OTHER_ID);
		});

		it("lets an admin through on every route", async () => {
			const c = caller(asAdmin);

			await c.getMyScore();
			await c.getMyKpis({});
			await c.getMySummary();
			await c.getMyProfile();
			await c.getPublicProfile({ id: OTHER_ID });

			expect(serviceMock.getPublicProfile).toHaveBeenCalledWith(OTHER_ID);
		});
	});

	describe("identity", () => {
		it("scopes the /me routes to the authenticated user", async () => {
			const c = caller(asMember);

			await c.getMyScore();
			await c.getMyKpis({});
			await c.getMySummary();
			await c.getMyProfile();

			expect(serviceMock.getMyScore).toHaveBeenCalledWith(MEMBER_ID);
			expect(serviceMock.getMyKpis).toHaveBeenCalledWith(MEMBER_ID, {});
			expect(serviceMock.getMySummary).toHaveBeenCalledWith(MEMBER_ID);
			expect(serviceMock.getMyProfile).toHaveBeenCalledWith(MEMBER_ID);
		});
	});

	describe("getMyKpis", () => {
		it("reads revoked=false as false, not true", async () => {
			await caller(asMember).getMyKpis({ revoked: "false" as never });

			expect(serviceMock.getMyKpis).toHaveBeenCalledWith(
				MEMBER_ID,
				expect.objectContaining({ revoked: false }),
			);
		});

		it("reads revoked=true as true", async () => {
			await caller(asMember).getMyKpis({ revoked: "true" as never });

			expect(serviceMock.getMyKpis).toHaveBeenCalledWith(
				MEMBER_ID,
				expect.objectContaining({ revoked: true }),
			);
		});

		it("treats a cleared filter as absent", async () => {
			await caller(asMember).getMyKpis({ revoked: "" as never });

			expect(serviceMock.getMyKpis).toHaveBeenCalledWith(
				MEMBER_ID,
				expect.objectContaining({ revoked: undefined }),
			);
		});

		it("rejects a value that is neither true nor false", async () => {
			await expect(
				caller(asMember).getMyKpis({ revoked: "sim" as never }),
			).rejects.toThrow();
			expect(serviceMock.getMyKpis).not.toHaveBeenCalled();
		});
	});

	describe("getPublicProfile", () => {
		it("rejects an id that is not a uuid", async () => {
			await expect(
				caller(asMember).getPublicProfile({ id: "abc" }),
			).rejects.toThrow();
			expect(serviceMock.getPublicProfile).not.toHaveBeenCalled();
		});
	});

	describe("badges", () => {
		it("returns the badges section on the own profile", async () => {
			const result = await caller(asMember).getMyProfile();

			expect(result.badges).toEqual(badges);
		});

		it("returns the ranking position and team size on the public profile", async () => {
			const result = await caller(asMember).getPublicProfile({
				id: OTHER_ID,
			});

			expect(result).toMatchObject({ rankingPosition: 3, teamSize: 12 });
		});

		it("returns the badges section on the public profile", async () => {
			const result = await caller(asMember).getPublicProfile({
				id: OTHER_ID,
			});

			expect(result.badges).toEqual(badges);
		});
	});
});
