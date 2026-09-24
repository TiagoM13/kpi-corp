import z from "zod";

import { emptyAsUndefined } from "../../shared/schemas";

export const MAX_INVITES_PER_REQUEST = 50;

const memberSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.email(),
	role: z.enum(["ADMIN", "MEMBER"]),
	position: z.string().nullable(),
	active: z.boolean(),
	createdAt: z.date(),
});

export const listMembersInputSchema = z.object({
	page: z.preprocess(
		emptyAsUndefined,
		z.coerce.number().int().min(1).default(1),
	),
	limit: z.preprocess(
		emptyAsUndefined,
		z.coerce.number().int().min(1).max(100).default(20),
	),
	search: z.preprocess(emptyAsUndefined, z.string().trim().min(1).optional()),
	status: z.preprocess(
		emptyAsUndefined,
		z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ALL"),
	),
});

export const listMembersResponseSchema = z.object({
	items: z.array(memberSchema),
	page: z.number(),
	limit: z.number(),
	total: z.number(),
	totalPages: z.number(),
});

export const memberIdInputSchema = z.object({
	id: z.uuid(),
});

export const memberResponseSchema = memberSchema;

export const inviteMembersInputSchema = z.object({
	emails: z.array(z.email()).min(1).max(MAX_INVITES_PER_REQUEST),
});

export const inviteMembersResponseSchema = z.object({
	created: z.array(
		z.object({
			id: z.string(),
			email: z.email(),
			token: z.string(),
			inviteUrl: z.url(),
			expiresAt: z.date(),
		}),
	),
	failed: z.array(
		z.object({
			email: z.email(),
			code: z.string(),
		}),
	),
});

export const setMemberStatusInputSchema = z.object({
	id: z.uuid(),
	active: z.boolean(),
});
