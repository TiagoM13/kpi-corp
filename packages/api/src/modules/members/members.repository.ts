import prisma from "@kpi-corp/db";

export type MemberStatusFilter = "ACTIVE" | "INACTIVE" | "ALL";

function whereFrom(search: string | undefined, status: MemberStatusFilter) {
	return {
		...(status === "ALL" ? {} : { active: status === "ACTIVE" }),
		...(search
			? {
					OR: [
						{ name: { contains: search, mode: "insensitive" as const } },
						{ email: { contains: search, mode: "insensitive" as const } },
					],
				}
			: {}),
	};
}

export const membersRepository = {
	list(params: {
		page: number;
		limit: number;
		search?: string;
		status: MemberStatusFilter;
	}) {
		const where = whereFrom(params.search, params.status);

		return prisma.$transaction(async (tx) => {
			const [items, total] = await Promise.all([
				tx.user.findMany({
					where,
					orderBy: { name: "asc" },
					skip: (params.page - 1) * params.limit,
					take: params.limit,
				}),
				tx.user.count({ where }),
			]);

			return { items, total };
		});
	},

	findById(id: string) {
		return prisma.user.findUnique({ where: { id } });
	},

	findUsersByEmails(emails: string[]) {
		return prisma.user.findMany({
			where: { email: { in: emails } },
			select: { email: true },
		});
	},

	replaceInvitation(data: {
		email: string;
		tokenHash: string;
		expiresAt: Date;
	}) {
		return prisma.$transaction(async (tx) => {
			await tx.invitation.updateMany({
				where: {
					email: data.email,
					usedAt: null,
					expiresAt: { gt: new Date() },
				},
				data: { expiresAt: new Date() },
			});

			return tx.invitation.create({ data });
		});
	},

	setStatus(id: string, active: boolean) {
		return prisma.$transaction(async (tx) => {
			const member = await tx.user.findUnique({ where: { id } });

			if (!member) {
				return { outcome: "NOT_FOUND" as const };
			}

			if (!active && member.active && member.role === "ADMIN") {
				const activeAdmins = await tx.user.count({
					where: { role: "ADMIN", active: true },
				});

				if (activeAdmins <= 1) {
					return { outcome: "LAST_ADMIN" as const };
				}
			}

			const updated = await tx.user.update({ where: { id }, data: { active } });

			if (!active) {
				await tx.refreshToken.updateMany({
					where: { userId: id, revokedAt: null },
					data: { revokedAt: new Date() },
				});
			}

			return { outcome: "OK" as const, member: updated };
		});
	},
};

export type MembersRepository = typeof membersRepository;
