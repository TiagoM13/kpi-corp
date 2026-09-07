import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemberNotFoundError } from "../../../modules/profile/profile.errors";
import { profileService } from "../../../modules/profile/profile.service";

const { repositoryMock } = vi.hoisted(() => ({
	repositoryMock: {
		findUserById: vi.fn(),
		findActivePublicUserById: vi.fn(),
		listScoredAssignments: vi.fn(),
		listAssignments: vi.fn(),
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

		it("throws MemberNotFoundError for an inactive or unknown member", async () => {
			repositoryMock.findActivePublicUserById.mockResolvedValueOnce(null);

			await expect(profileService.getPublicProfile(USER_ID)).rejects.toThrow(
				MemberNotFoundError,
			);
			expect(repositoryMock.listAssignments).not.toHaveBeenCalled();
		});
	});
});
