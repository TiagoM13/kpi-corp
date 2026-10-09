import prisma from "@kpi-corp/db";

export const sessionRepository = {
	findUserStatus(id: string) {
		return prisma.user.findUnique({
			where: { id },
			select: { active: true, role: true },
		});
	},
};

export type SessionRepository = typeof sessionRepository;
