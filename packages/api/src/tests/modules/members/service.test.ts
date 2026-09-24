import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	CannotDeactivateSelfError,
	LastAdminCannotBeDeactivatedError,
} from "../../../modules/members/members.errors";
import { membersService } from "../../../modules/members/members.service";
import { MemberNotFoundError } from "../../../shared/errors/common.errors";

const WEB_APP_URL = "https://app.kpicorp.test";
const CORS_ORIGIN = "https://cors.kpicorp.test";

vi.mock("@kpi-corp/env/server", () => ({
	env: {
		WEB_APP_URL: "https://app.kpicorp.test",
		CORS_ORIGIN: "https://cors.kpicorp.test",
	},
}));

const { repositoryMock } = vi.hoisted(() => ({
	repositoryMock: {
		list: vi.fn(),
		findById: vi.fn(),
		findUsersByEmails: vi.fn(),
		replaceInvitation: vi.fn(),
		setStatus: vi.fn(),
	},
}));

vi.mock("../../../modules/members/members.repository", () => ({
	membersRepository: repositoryMock,
}));

const ADMIN_ID = "b29f5637-0ab1-4de0-b2d2-d364e3903124";
const MEMBER_ID = "26a1f9b0-0dc1-4ee3-9696-d0e4434e9caf";

const member = {
	id: MEMBER_ID,
	name: "Ana Souza",
	email: "ana@kpicorp.com",
	passwordHash: "",
	role: "MEMBER" as const,
	position: "Designer",
	active: true,
	createdAt: new Date(),
};

describe("members service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		repositoryMock.findUsersByEmails.mockResolvedValue([]);
		repositoryMock.replaceInvitation.mockImplementation(
			async (data: { email: string; token: string; expiresAt: Date }) => ({
				id: `inv-${data.email}`,
				...data,
				usedAt: null,
				createdAt: new Date(),
			}),
		);
	});

	describe("list", () => {
		it("should compute totalPages from total and limit", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [member], total: 21 });

			const result = await membersService.list({
				page: 1,
				limit: 20,
				status: "ALL",
			});

			expect(result.total).toBe(21);
			expect(result.totalPages).toBe(2);
			expect(result.items).toHaveLength(1);
		});

		it("should report one page when there is nothing to list", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [], total: 0 });

			const result = await membersService.list({
				page: 1,
				limit: 20,
				status: "ALL",
			});

			expect(result.totalPages).toBe(1);
		});

		it("should forward search and status to the repository", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [], total: 0 });

			await membersService.list({
				page: 2,
				limit: 10,
				search: "ana",
				status: "ACTIVE",
			});

			expect(repositoryMock.list).toHaveBeenCalledWith({
				page: 2,
				limit: 10,
				search: "ana",
				status: "ACTIVE",
			});
		});

		it("should not leak the password hash", async () => {
			repositoryMock.list.mockResolvedValueOnce({ items: [member], total: 1 });

			const result = await membersService.list({
				page: 1,
				limit: 20,
				status: "ALL",
			});

			expect(result.items[0]).not.toHaveProperty("passwordHash");
		});
	});

	describe("getById", () => {
		it("should return the member", async () => {
			repositoryMock.findById.mockResolvedValueOnce(member);

			expect(await membersService.getById(MEMBER_ID)).toMatchObject({
				id: MEMBER_ID,
				email: "ana@kpicorp.com",
			});
		});

		it("should throw MemberNotFoundError for an unknown id", async () => {
			repositoryMock.findById.mockResolvedValueOnce(null);

			await expect(membersService.getById(MEMBER_ID)).rejects.toThrow(
				MemberNotFoundError,
			);
		});

		it("should not leak the password hash", async () => {
			repositoryMock.findById.mockResolvedValueOnce(member);

			expect(await membersService.getById(MEMBER_ID)).not.toHaveProperty(
				"passwordHash",
			);
		});
	});

	describe("invite", () => {
		it("should create an invitation with a 48h expiry and a full url", async () => {
			const before = Date.now();

			const { created } = await membersService.invite(["novo@kpicorp.com"]);
			const invite = created[0];

			expect(invite).toBeDefined();
			expect(invite?.inviteUrl).toBe(`${WEB_APP_URL}/invite/${invite?.token}`);

			const ttl = (invite?.expiresAt.getTime() ?? 0) - before;
			expect(ttl).toBeGreaterThan(47 * 60 * 60 * 1000);
			expect(ttl).toBeLessThanOrEqual(48 * 60 * 60 * 1000 + 1000);
		});

		it("should build the invite url from WEB_APP_URL, not CORS_ORIGIN", async () => {
			const { created } = await membersService.invite(["novo@kpicorp.com"]);

			expect(created[0]?.inviteUrl).toBe(
				`${WEB_APP_URL}/invite/${created[0]?.token}`,
			);
			expect(created[0]?.inviteUrl).not.toContain(CORS_ORIGIN);
		});

		it("should generate an opaque token, not a uuid", async () => {
			const { created } = await membersService.invite(["novo@kpicorp.com"]);

			expect(created[0]?.token).not.toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
			expect((created[0]?.token ?? "").length).toBeGreaterThanOrEqual(32);
		});

		it("should keep going when one address already belongs to a user", async () => {
			repositoryMock.findUsersByEmails.mockResolvedValueOnce([
				{ email: "ana@kpicorp.com" },
			]);

			const result = await membersService.invite([
				"ana@kpicorp.com",
				"novo@kpicorp.com",
			]);

			expect(result.created.map((i) => i.email)).toEqual(["novo@kpicorp.com"]);
			expect(result.failed).toEqual([
				{ email: "ana@kpicorp.com", code: "EMAIL_ALREADY_REGISTERED" },
			]);
		});

		it("should return an empty created list when every address fails", async () => {
			repositoryMock.findUsersByEmails.mockResolvedValueOnce([
				{ email: "ana@kpicorp.com" },
			]);

			const result = await membersService.invite(["ana@kpicorp.com"]);

			expect(result.created).toEqual([]);
			expect(result.failed).toHaveLength(1);
		});

		it("should deduplicate addresses within one request", async () => {
			const result = await membersService.invite([
				"novo@kpicorp.com",
				"NOVO@kpicorp.com",
				" novo@kpicorp.com ",
			]);

			expect(result.created).toHaveLength(1);
			expect(repositoryMock.replaceInvitation).toHaveBeenCalledTimes(1);
		});

		it("should normalize the address before storing it", async () => {
			await membersService.invite(["  Novo@KpiCorp.com  "]);

			expect(repositoryMock.replaceInvitation).toHaveBeenCalledWith(
				expect.objectContaining({ email: "novo@kpicorp.com" }),
			);
		});

		it("should match an existing user case-insensitively", async () => {
			repositoryMock.findUsersByEmails.mockResolvedValueOnce([
				{ email: "Ana@KpiCorp.com" },
			]);

			const result = await membersService.invite(["ana@kpicorp.com"]);

			expect(result.created).toEqual([]);
			expect(result.failed).toHaveLength(1);
		});
	});

	describe("setStatus", () => {
		it("should deactivate a member", async () => {
			repositoryMock.setStatus.mockResolvedValueOnce({
				outcome: "OK",
				member: { ...member, active: false },
			});

			const result = await membersService.setStatus({
				id: MEMBER_ID,
				active: false,
				requestedBy: ADMIN_ID,
			});

			expect(result.active).toBe(false);
			expect(repositoryMock.setStatus).toHaveBeenCalledWith(MEMBER_ID, false);
		});

		it("should reactivate a member", async () => {
			repositoryMock.setStatus.mockResolvedValueOnce({
				outcome: "OK",
				member: { ...member, active: true },
			});

			const result = await membersService.setStatus({
				id: MEMBER_ID,
				active: true,
				requestedBy: ADMIN_ID,
			});

			expect(result.active).toBe(true);
		});

		it("should refuse self-deactivation before touching the database", async () => {
			await expect(
				membersService.setStatus({
					id: ADMIN_ID,
					active: false,
					requestedBy: ADMIN_ID,
				}),
			).rejects.toThrow(CannotDeactivateSelfError);

			expect(repositoryMock.setStatus).not.toHaveBeenCalled();
		});

		it("should allow reactivating yourself", async () => {
			repositoryMock.setStatus.mockResolvedValueOnce({
				outcome: "OK",
				member: { ...member, id: ADMIN_ID, active: true },
			});

			await expect(
				membersService.setStatus({
					id: ADMIN_ID,
					active: true,
					requestedBy: ADMIN_ID,
				}),
			).resolves.toBeDefined();
		});

		it("should surface the last-admin guard from the repository", async () => {
			repositoryMock.setStatus.mockResolvedValueOnce({ outcome: "LAST_ADMIN" });

			await expect(
				membersService.setStatus({
					id: MEMBER_ID,
					active: false,
					requestedBy: ADMIN_ID,
				}),
			).rejects.toThrow(LastAdminCannotBeDeactivatedError);
		});

		it("should throw MemberNotFoundError for an unknown id", async () => {
			repositoryMock.setStatus.mockResolvedValueOnce({ outcome: "NOT_FOUND" });

			await expect(
				membersService.setStatus({
					id: MEMBER_ID,
					active: false,
					requestedBy: ADMIN_ID,
				}),
			).rejects.toThrow(MemberNotFoundError);
		});
	});
});
