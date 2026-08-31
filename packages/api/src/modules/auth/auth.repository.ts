import prisma from "@kpi-corp/db";

import type { Role } from "@kpi-corp/db/prisma/generated/enums";

type CreateUserData = {
	name: string;
	email: string;
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

	findInvitationByToken(token: string) {
		return prisma.invitation.findUnique({
			where: { token },
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

	/** Revokes a token only if still active; the count tells whether we won the race. */
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

	/**
	 * Claims the invitation and creates the user atomically.
	 *
	 * The claim is an `updateMany` guarded by `usedAt: null`, so two concurrent
	 * registrations with the same token cannot both succeed.
	 */
	executeRegisterTransaction(invitationId: string, data: CreateUserData) {
		return prisma.$transaction(async (tx) => {
			const claimed = await tx.invitation.updateMany({
				where: { id: invitationId, usedAt: null },
				data: { usedAt: new Date() },
			});

			if (claimed.count === 0) {
				return { success: false as const };
			}

			const user = await tx.user.create({
				data,
			});

			return { success: true as const, user };
		});
	},
};

export type AuthRepository = typeof authRepository;
