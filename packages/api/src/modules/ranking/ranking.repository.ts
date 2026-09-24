import prisma from "@kpi-corp/db";

import type { RankingPeriod as PrismaRankingPeriod } from "@kpi-corp/db/prisma/generated/enums";
import type { RankedRow, RankingWindow } from "../../shared/ranking";

export type RankingPeriodKey = "week" | "month" | "quarter";

const PERIOD_VALUES: Record<RankingPeriodKey, PrismaRankingPeriod> = {
	week: "WEEK",
	month: "MONTH",
	quarter: "QUARTER",
};

// @db.Date guarda a chave como dia puro: o token gravado e o token consultado
// são sempre meia-noite UTC, independente do fuso em que as janelas recortam.
function dateToken(day: string): Date {
	return new Date(`${day}T00:00:00.000Z`);
}

const MEMBER_SELECT = {
	id: true,
	name: true,
	position: true,
	role: true,
	assignedKpis: {
		where: { revokedAt: null },
		select: { points: true },
	},
} as const;

export const rankingRepository = {
	// Todo usuário ativo entra — ADMIN incluído — mesmo sem nenhuma
	// atribuição na janela: o ranking é da equipe, não dos premiados.
	aggregateWindow(window: RankingWindow) {
		return prisma.user.findMany({
			where: { active: true },
			select: {
				...MEMBER_SELECT,
				assignedKpis: {
					where: {
						revokedAt: null,
						assignedAt: { gte: window.start, lt: window.end },
					},
					select: { points: true },
				},
			},
		});
	},

	aggregateAll() {
		return prisma.user.findMany({
			where: { active: true },
			select: MEMBER_SELECT,
		});
	},

	countAssignmentsInWindow(window: RankingWindow) {
		return prisma.kpiAssignment.count({
			where: {
				revokedAt: null,
				assignedAt: { gte: window.start, lt: window.end },
			},
		});
	},

	findSnapshot(period: RankingPeriodKey, startDay: string) {
		return prisma.rankingSnapshot.findMany({
			where: {
				period: PERIOD_VALUES[period],
				periodStart: dateToken(startDay),
			},
		});
	},

	findSnapshotStarts(period: RankingPeriodKey, startDays: string[]) {
		return prisma.rankingSnapshot.findMany({
			where: {
				period: PERIOD_VALUES[period],
				periodStart: { in: startDays.map(dateToken) },
			},
			select: { periodStart: true },
		});
	},

	createSnapshots(
		period: RankingPeriodKey,
		startDay: string,
		ranked: RankedRow[],
	) {
		return prisma.rankingSnapshot.createMany({
			data: ranked.map((row) => ({
				period: PERIOD_VALUES[period],
				periodStart: dateToken(startDay),
				userId: row.userId,
				position: row.position,
				points: row.points,
				kpiCount: row.kpiCount,
			})),
			skipDuplicates: true,
		});
	},
};

export type RankingRepository = typeof rankingRepository;
