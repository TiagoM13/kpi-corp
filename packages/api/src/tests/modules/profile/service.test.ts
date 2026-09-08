import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemberNotFoundError } from "../../../modules/profile/profile.errors";
import { profileService } from "../../../modules/profile/profile.service";

const { repositoryMock } = vi.hoisted(() => ({
	repositoryMock: {
		findUserById: vi.fn(),
		findActivePublicUserById: vi.fn(),
		listScoredAssignments: vi.fn(),
		listAssignments: vi.fn(),
		listValidAssignments: vi.fn(),
		listEarnedBadges: vi.fn(),
		stampBadges: vi.fn(),
	},
}));

vi.mock("../../../modules/profile/profile.repository", () => ({
	profileRepository: repositoryMock,
}));

const USER_ID = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";

const user = {
	id: USER_ID,
	name: "Ana Souza",
	email: "ana@kpicorp.com",
	position: null,
	role: "MEMBER" as const,
	active: true,
	createdAt: new Date(),
};

function assignment(overrides: Record<string, unknown> = {}) {
	return {
		id: "182d809a-62d5-4d5a-8ce4-1794e7c868c3",
		kpiId: "05ef1cad-3b52-495b-b327-7ad75f169f97",
		points: 5,
		note: null,
		assignedAt: new Date("2026-09-07T12:00:00.000Z"),
		revokedAt: null,
		kpi: { name: "Presença na reunião", category: "PRESENCE" as const },
		...overrides,
	};
}

describe("profile service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		repositoryMock.listValidAssignments.mockResolvedValue([]);
		repositoryMock.listEarnedBadges.mockResolvedValue([]);
		repositoryMock.stampBadges.mockResolvedValue({ count: 0 });
	});

	describe("getMyScore", () => {
		it("sums the scored rows into the total and categories", async () => {
			repositoryMock.listScoredAssignments.mockResolvedValueOnce([
				{ points: 5, kpi: { category: "PRESENCE" } },
				{ points: 12, kpi: { category: "PERFORMANCE" } },
				{ points: 10, kpi: { category: "BEHAVIOR" } },
			]);

			const score = await profileService.getMyScore(USER_ID);

			expect(score.total).toBe(27);
			expect(score.categories).toEqual({
				presence: 5,
				performance: 12,
				behavior: 10,
				initiative: 0,
			});
			expect(score.level.currentPoints).toBe(27);
		});

		it("keeps all four categories at zero without assignments", async () => {
			repositoryMock.listScoredAssignments.mockResolvedValueOnce([]);

			const score = await profileService.getMyScore(USER_ID);

			expect(score).toMatchObject({
				total: 0,
				categories: {
					presence: 0,
					performance: 0,
					behavior: 0,
					initiative: 0,
				},
			});
			expect(score.level.level).toBe(0);
		});

		it("sums the frozen assignment points, not the kpi price", async () => {
			// O KPI hoje vale 50, mas a atribuição congelou 5.
			repositoryMock.listScoredAssignments.mockResolvedValueOnce([
				{ points: 5, kpi: { category: "PRESENCE" } },
			]);

			const score = await profileService.getMyScore(USER_ID);

			expect(score.total).toBe(5);
		});
	});

	describe("getMyKpis", () => {
		it("maps the assignments with the kpi embedded", async () => {
			repositoryMock.listAssignments.mockResolvedValueOnce([
				assignment({ note: "Excelente apresentação" }),
			]);

			const { items } = await profileService.getMyKpis(USER_ID, {});

			expect(items[0]).toMatchObject({
				kpiId: "05ef1cad-3b52-495b-b327-7ad75f169f97",
				name: "Presença na reunião",
				category: "PRESENCE",
				points: 5,
				note: "Excelente apresentação",
				revokedAt: null,
			});
		});

		it("marks revoked assignments instead of hiding them", async () => {
			const revokedAt = new Date("2026-09-07T13:00:00.000Z");
			repositoryMock.listAssignments.mockResolvedValueOnce([
				assignment({ revokedAt }),
			]);

			const { items } = await profileService.getMyKpis(USER_ID, {});

			expect(items).toHaveLength(1);
			expect(items[0]?.revokedAt).toEqual(revokedAt);
		});

		it("forwards the revoked filter untouched", async () => {
			repositoryMock.listAssignments.mockResolvedValueOnce([]);

			await profileService.getMyKpis(USER_ID, { revoked: false });

			expect(repositoryMock.listAssignments).toHaveBeenCalledWith(USER_ID, {
				revoked: false,
			});
		});
	});

	describe("getMySummary", () => {
		it("counts every assignment but scores only valid ones", async () => {
			repositoryMock.listAssignments.mockResolvedValueOnce([
				assignment({ points: 5, kpi: { name: "A", category: "PRESENCE" } }),
				assignment({
					points: 7,
					kpi: { name: "B", category: "BEHAVIOR" },
					revokedAt: new Date("2026-09-07T13:00:00.000Z"),
				}),
			]);

			const summary = await profileService.getMySummary(USER_ID);

			expect(summary.totalCount).toBe(2);
			expect(summary.countByCategory).toEqual({
				presence: 1,
				performance: 0,
				behavior: 1,
				initiative: 0,
			});
			expect(summary.scoreByCategory).toEqual({
				presence: 5,
				performance: 0,
				behavior: 0,
				initiative: 0,
			});
		});

		it("takes the first row as the last assignment", async () => {
			repositoryMock.listAssignments.mockResolvedValueOnce([
				assignment({ id: "mais-recente" }),
				assignment({ id: "mais-antiga" }),
			]);

			const summary = await profileService.getMySummary(USER_ID);

			expect(summary.lastAssignment?.id).toBe("mais-recente");
		});

		it("returns a null last assignment without assignments", async () => {
			repositoryMock.listAssignments.mockResolvedValueOnce([]);

			const summary = await profileService.getMySummary(USER_ID);

			expect(summary.totalCount).toBe(0);
			expect(summary.lastAssignment).toBeNull();
		});
	});

	describe("getMyBadges", () => {
		const NOW = new Date("2026-03-16T12:00:00.000Z");

		function validAssignment(
			isoDate: string,
			category = "PRESENCE",
		): { points: number; assignedAt: Date; kpi: { category: string } } {
			return {
				points: 5,
				assignedAt: new Date(isoDate),
				kpi: { category },
			};
		}

		it("loads the valid assignments and the earned rows by user id", async () => {
			await profileService.getMyBadges(USER_ID, NOW);

			expect(repositoryMock.listValidAssignments).toHaveBeenCalledWith(USER_ID);
			expect(repositoryMock.listEarnedBadges).toHaveBeenCalledWith(USER_ID);
		});

		it("keeps an earned badge after the KPI that generated it is revoked", async () => {
			const earnedAt = new Date("2026-03-02T12:00:00.000Z");
			repositoryMock.listValidAssignments.mockResolvedValueOnce([]);
			repositoryMock.listEarnedBadges.mockResolvedValueOnce([
				{ code: "FIVE_PERFORMANCE", earnedAt },
			]);

			const badges = await profileService.getMyBadges(USER_ID, NOW);
			const badge = badges.find((entry) => entry.code === "FIVE_PERFORMANCE");

			expect(badge).toMatchObject({
				earned: true,
				earnedAt,
				progress: 100,
				current: 0,
				target: 5,
			});
			expect(repositoryMock.stampBadges).not.toHaveBeenCalled();
		});

		it("does not restamp an already stamped badge", async () => {
			repositoryMock.listValidAssignments.mockResolvedValueOnce([
				validAssignment("2026-03-02T12:00:00.000Z"),
			]);
			repositoryMock.listEarnedBadges.mockResolvedValueOnce([
				{
					code: "FIRST_POINT",
					earnedAt: new Date("2026-03-02T12:00:00.000Z"),
				},
			]);

			const badges = await profileService.getMyBadges(USER_ID, NOW);

			expect(badges.find((entry) => entry.code === "FIRST_POINT")?.earned).toBe(
				true,
			);
			expect(repositoryMock.stampBadges).not.toHaveBeenCalled();
		});

		it("stamps only the newly earned badges", async () => {
			const fifth = validAssignment("2026-03-06T12:00:00.000Z", "PERFORMANCE");
			repositoryMock.listValidAssignments.mockResolvedValueOnce([
				validAssignment("2026-03-02T12:00:00.000Z", "PERFORMANCE"),
				validAssignment("2026-03-03T12:00:00.000Z", "PERFORMANCE"),
				validAssignment("2026-03-04T12:00:00.000Z", "PERFORMANCE"),
				validAssignment("2026-03-05T12:00:00.000Z", "PERFORMANCE"),
				fifth,
			]);
			repositoryMock.listEarnedBadges.mockResolvedValueOnce([
				{
					code: "FIRST_POINT",
					earnedAt: new Date("2026-03-02T12:00:00.000Z"),
				},
			]);

			const badges = await profileService.getMyBadges(USER_ID, NOW);

			expect(repositoryMock.stampBadges).toHaveBeenCalledTimes(1);
			expect(repositoryMock.stampBadges).toHaveBeenCalledWith(USER_ID, [
				{ code: "FIVE_PERFORMANCE", earnedAt: fifth.assignedAt },
			]);
			expect(
				badges.find((entry) => entry.code === "FIVE_PERFORMANCE"),
			).toMatchObject({ earned: true, earnedAt: fifth.assignedAt });
		});

		it("ignores an earned row whose code is outside the catalog", async () => {
			repositoryMock.listEarnedBadges.mockResolvedValueOnce([
				{ code: "MENTOR", earnedAt: new Date("2026-03-02T12:00:00.000Z") },
			]);

			const badges = await profileService.getMyBadges(USER_ID, NOW);

			expect(badges).toHaveLength(10);
			expect(badges.some((entry) => entry.code === ("MENTOR" as never))).toBe(
				false,
			);
			expect(repositoryMock.stampBadges).not.toHaveBeenCalled();
		});

		it("returns the Fase 3 badges unavailable and unearned", async () => {
			const badges = await profileService.getMyBadges(USER_ID, NOW);

			for (const code of [
				"TEN_MEETINGS",
				"TOP_THREE",
				"PERFECT_MONTH",
				"PODIUM_STREAK",
			]) {
				expect(
					badges.find((entry) => entry.code === code),
					code,
				).toMatchObject({ available: false, earned: false });
			}
		});

		// O filtro revokedAt IS NULL / points > 0 é responsabilidade do
		// repository (where do Prisma); aqui o mock já devolve só o válido.
		it("relies on the repository for the valid-assignment filter", async () => {
			await profileService.getMyBadges(USER_ID, NOW);

			expect(repositoryMock.listValidAssignments).toHaveBeenCalledTimes(1);
		});
	});

	describe("getMyProfile", () => {
		it("returns the member with email and status", async () => {
			repositoryMock.findUserById.mockResolvedValueOnce(user);
			repositoryMock.listScoredAssignments.mockResolvedValueOnce([]);
			repositoryMock.listAssignments.mockResolvedValueOnce([]);

			const profile = await profileService.getMyProfile(USER_ID);

			expect(profile.member).toMatchObject({
				id: USER_ID,
				email: "ana@kpicorp.com",
				active: true,
			});
			expect(profile.total).toBe(0);
			expect(profile.kpis).toEqual([]);
		});

		it("throws MemberNotFoundError for an unknown user", async () => {
			repositoryMock.findUserById.mockResolvedValueOnce(null);

			await expect(profileService.getMyProfile(USER_ID)).rejects.toThrow(
				MemberNotFoundError,
			);
		});
	});

	describe("getPublicProfile", () => {
		it("hides email and activation status", async () => {
			repositoryMock.findActivePublicUserById.mockResolvedValueOnce({
				id: USER_ID,
				name: "Ana Souza",
				position: null,
				role: "MEMBER",
			});
			repositoryMock.listScoredAssignments.mockResolvedValueOnce([]);
			repositoryMock.listAssignments.mockResolvedValueOnce([]);

			const profile = await profileService.getPublicProfile(USER_ID);

			expect(profile.member).not.toHaveProperty("email");
			expect(profile.member).not.toHaveProperty("active");
		});

		it("requests only valid assignments for the history", async () => {
			repositoryMock.findActivePublicUserById.mockResolvedValueOnce({
				id: USER_ID,
				name: "Ana Souza",
				position: null,
				role: "MEMBER",
			});
			repositoryMock.listScoredAssignments.mockResolvedValueOnce([]);
			repositoryMock.listAssignments.mockResolvedValueOnce([]);

			await profileService.getPublicProfile(USER_ID);

			expect(repositoryMock.listAssignments).toHaveBeenCalledWith(USER_ID, {
				revoked: false,
			});
		});

		it("returns the ten badges alongside the public profile", async () => {
			repositoryMock.findActivePublicUserById.mockResolvedValueOnce({
				id: USER_ID,
				name: "Ana Souza",
				position: null,
				role: "MEMBER",
			});
			repositoryMock.listScoredAssignments.mockResolvedValueOnce([]);
			repositoryMock.listAssignments.mockResolvedValueOnce([]);

			const profile = await profileService.getPublicProfile(USER_ID);

			expect(profile.badges).toHaveLength(10);
			expect(
				profile.badges.find((entry) => entry.code === "FIRST_POINT"),
			).toMatchObject({ earned: false, available: true });
		});

		it("throws MemberNotFoundError for an inactive or unknown member", async () => {
			repositoryMock.findActivePublicUserById.mockResolvedValueOnce(null);

			await expect(profileService.getPublicProfile(USER_ID)).rejects.toThrow(
				MemberNotFoundError,
			);
			expect(repositoryMock.listAssignments).not.toHaveBeenCalled();
		});
	});
});
