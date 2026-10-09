import prisma from "@kpi-corp/db";
import { Prisma } from "@kpi-corp/db/prisma/generated/client";

import type { Role } from "@kpi-corp/db/prisma/generated/enums";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";

type CreateUserData = {
	name: string;
	email: string;
	position: string | null;
	passwordHash: string;
	role: Role;
};

export const authRepository = {
	findUserByEmail(email: string) {
		return prisma.user.findUnique({
			where: { email },
		});
	},

	findUserById(id: string) {
		return prisma.user.findUnique({
			where: { id },
		});
	},

	findInvitationByTokenHash(tokenHash: string) {
		return prisma.invitation.findUnique({
			where: { tokenHash },
		});
	},

	createRefreshToken(data: {
		id: string;
		userId: string;
		tokenHash: string;
		expiresAt: Date;
	}) {
		return prisma.refreshToken.create({
			data,
		});
	},

	findRefreshTokenById(id: string) {
		return prisma.refreshToken.findUnique({
			where: { id },
			include: { user: true },
		});
	},

	revokeRefreshToken(id: string) {
		return prisma.refreshToken.updateMany({
			where: {
				id,
				revokedAt: null,
			},
			data: {
				revokedAt: new Date(),
			},
		});
	},

	revokeAllRefreshTokensForUser(userId: string) {
		return prisma.refreshToken.updateMany({
			where: {
				userId,
				revokedAt: null,
			},
			data: {
				revokedAt: new Date(),
			},
		});
	},

	executeRegisterTransaction(invitationId: string, data: CreateUserData) {
		return prisma
			.$transaction(async (tx) => {
				const claimed = await tx.invitation.updateMany({
					where: { id: invitationId, usedAt: null },
					data: { usedAt: new Date() },
				});

				if (claimed.count === 0) {
					return { outcome: "ALREADY_USED" as const };
				}

				const user = await tx.user.create({
					data,
				});

				return { outcome: "OK" as const, user };
			})
			.catch((error: unknown) => {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === UNIQUE_CONSTRAINT_VIOLATION
				) {
					return { outcome: "EMAIL_TAKEN" as const };
				}

				throw error;
			});
	},
};

export type AuthRepository = typeof authRepository;
