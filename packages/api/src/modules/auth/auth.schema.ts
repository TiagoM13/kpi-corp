import z from "zod";

const publicUserSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.email(),
	role: z.enum(["ADMIN", "MEMBER"]),
});

export const loginInputSchema = z.object({
	email: z.email(),
	password: z.string().min(1),
});

export const loginResponseSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
	user: publicUserSchema,
});

export const refreshInputSchema = z.object({
	refreshToken: z.string().min(1),
});

export const refreshResponseSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
	user: publicUserSchema,
});

export const meResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.email(),
	role: z.enum(["ADMIN", "MEMBER"]),
	avatar: z.string().nullable().optional(),
});

export const logoutInputSchema = z.object({
	refreshToken: z.string().optional(),
});

export const logoutResponseSchema = z.object({
	success: z.literal(true),
});

export const registerInputSchema = z.object({
	token: z.string().min(1),
	name: z.string().min(1),
	password: z.string().min(6),
});

export const registerResponseSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
	user: publicUserSchema,
});
