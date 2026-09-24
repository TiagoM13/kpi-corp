import { env } from "@kpi-corp/env/server";
import { normalizeEmail } from "../../shared/email";
import {
	EmailAlreadyRegisteredError,
	MemberNotFoundError,
} from "../../shared/errors/common.errors";
import { generateOpaqueToken } from "../../shared/security/tokens";
import {
	CannotDeactivateSelfError,
	LastAdminCannotBeDeactivatedError,
} from "./members.errors";
import { type Member, mapUserToMember } from "./members.mapper";
import {
	type MemberStatusFilter,
	membersRepository,
} from "./members.repository";

const INVITE_TTL_HOURS = 48;

export type ListMembersInput = {
	page: number;
	limit: number;
	search?: string;
	status: MemberStatusFilter;
};

export type InviteResult = {
	created: {
		id: string;
		email: string;
		token: string;
		inviteUrl: string;
		expiresAt: Date;
	}[];
	failed: { email: string; code: string }[];
};

function inviteUrlFor(token: string) {
	return new URL(`/invite/${token}`, env.WEB_APP_URL).toString();
}

export const membersService = {
	async list(input: ListMembersInput) {
		const { items, total } = await membersRepository.list(input);

		return {
			items: items.map(mapUserToMember),
			page: input.page,
			limit: input.limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / input.limit)),
		};
	},

	async getById(id: string): Promise<Member> {
		const member = await membersRepository.findById(id);

		if (!member) {
			throw new MemberNotFoundError();
		}

		return mapUserToMember(member);
	},

	async invite(emails: string[]): Promise<InviteResult> {
		const unique = [...new Set(emails.map(normalizeEmail))];
		const existing = await membersRepository.findUsersByEmails(unique);
		const taken = new Set(existing.map((user) => normalizeEmail(user.email)));

		const created: InviteResult["created"] = [];
		const failed: InviteResult["failed"] = [];

		for (const email of unique) {
			if (taken.has(email)) {
				failed.push({
					email,
					code: new EmailAlreadyRegisteredError().code,
				});
				continue;
			}

			const token = generateOpaqueToken();
			const expiresAt = new Date(
				Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000,
			);
			const invitation = await membersRepository.replaceInvitation({
				email,
				token,
				expiresAt,
			});

			created.push({
				id: invitation.id,
				email: invitation.email,
				token: invitation.token,
				inviteUrl: inviteUrlFor(invitation.token),
				expiresAt: invitation.expiresAt,
			});
		}

		return { created, failed };
	},

	async setStatus(input: {
		id: string;
		active: boolean;
		requestedBy: string;
	}): Promise<Member> {
		if (!input.active && input.id === input.requestedBy) {
			throw new CannotDeactivateSelfError();
		}

		const result = await membersRepository.setStatus(input.id, input.active);

		if (result.outcome === "NOT_FOUND") {
			throw new MemberNotFoundError();
		}

		if (result.outcome === "LAST_ADMIN") {
			throw new LastAdminCannotBeDeactivatedError();
		}

		return mapUserToMember(result.member);
	},
};

export type MembersService = typeof membersService;
