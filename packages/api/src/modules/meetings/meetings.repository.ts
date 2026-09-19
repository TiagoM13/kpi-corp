import prisma from "@kpi-corp/db";

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type MeetingsDbClient = DbClient;

const KPI_INCLUDE = {
	select: { id: true, name: true, category: true },
} as const;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type MeetingStatusFilter = "OPEN" | "CLOSED" | "ALL";

export type ListMeetingsFilter = {
	status: MeetingStatusFilter;
	from?: Date;
	to?: Date;
	page: number;
	limit: number;
};

export type MeetingWritableData = {
	title: string;
	date: Date;
	createdBy: string;
};

// Mesma regra da 2B: points e copiado do KPI no instante da atribuicao.
// Modulo nao importa de modulo, entao esta linha existe aqui tambem.
export type MeetingAssignmentWritableData = {
	kpiId: string;
	userId: string;
	assignedBy: string;
	meetingId: string;
	note: string | null;
	points: number;
};

function listWhereFrom(filter: ListMeetingsFilter) {
	const date =
		filter.from || filter.to
			? {
					...(filter.from ? { gte: filter.from } : {}),
					// Inclusivo nas duas pontas: ate o fim do dia de `to`.
					...(filter.to
						? { lt: new Date(filter.to.getTime() + DAY_IN_MS) }
						: {}),
				}
			: undefined;

	return {
		...(filter.status === "ALL"
			? {}
			: { closedAt: filter.status === "OPEN" ? null : { not: null } }),
		...(date ? { date } : {}),
	};
}

export const meetingsRepository = {
	transaction<T>(run: (tx: DbClient) => Promise<T>): Promise<T> {
		return prisma.$transaction(run);
	},

	create(data: MeetingWritableData, db: DbClient = prisma) {
		return db.meeting.create({ data });
	},

	findById(id: string, db: DbClient = prisma) {
		return db.meeting.findUnique({ where: { id } });
	},

	findCreator(id: string, db: DbClient = prisma) {
		return db.user.findUnique({
			where: { id },
			select: { id: true, name: true },
		});
	},

	findDetailById(id: string, db: DbClient = prisma) {
		return db.meeting.findUnique({
			where: { id },
			include: {
				attendees: {
					orderBy: { user: { name: "asc" } },
					include: { user: { select: { name: true, position: true } } },
				},
				assignments: {
					orderBy: { assignedAt: "desc" },
					include: { kpi: KPI_INCLUDE },
				},
			},
		});
	},

	findKpiById(id: string, db: DbClient = prisma) {
		return db.kpi.findUnique({ where: { id } });
	},

	findUsersByIds(userIds: string[], db: DbClient = prisma) {
		return db.user.findMany({ where: { id: { in: userIds } } });
	},

	findAttendee(meetingId: string, userId: string, db: DbClient = prisma) {
		return db.meetingAttendee.findUnique({
			where: { meetingId_userId: { meetingId, userId } },
		});
	},

	findAttendees(meetingId: string, userIds: string[], db: DbClient = prisma) {
		return db.meetingAttendee.findMany({
			where: { meetingId, userId: { in: userIds } },
		});
	},

	addAttendees(meetingId: string, userIds: string[], db: DbClient = prisma) {
		return db.meetingAttendee.createMany({
			data: userIds.map((userId) => ({ meetingId, userId })),
			skipDuplicates: true,
		});
	},

	// Quem nao tinha linha entra ja presente. Ja presente nao chega aqui:
	// o service filtra antes.
	createPresentAttendees(
		meetingId: string,
		userIds: string[],
		presentAt: Date,
		db: DbClient = prisma,
	) {
		return db.meetingAttendee.createMany({
			data: userIds.map((userId) => ({ meetingId, userId, presentAt })),
			skipDuplicates: true,
		});
	},

	// Quem estava escalado so carimba a presenca.
	markAttendeesPresent(
		meetingId: string,
		userIds: string[],
		presentAt: Date,
		db: DbClient = prisma,
	) {
		return db.meetingAttendee.updateMany({
			where: { meetingId, userId: { in: userIds }, presentAt: null },
			data: { presentAt },
		});
	},

	createAssignments(
		data: MeetingAssignmentWritableData[],
		db: DbClient = prisma,
	) {
		return db.kpiAssignment.createMany({ data });
	},

	createAssignment(data: MeetingAssignmentWritableData, db: DbClient = prisma) {
		return db.kpiAssignment.create({
			data,
			include: { kpi: KPI_INCLUDE },
		});
	},

	close(id: string, closedAt: Date, db: DbClient = prisma) {
		return db.meeting.update({ where: { id }, data: { closedAt } });
	},

	list(filter: ListMeetingsFilter) {
		const where = listWhereFrom(filter);

		return prisma.$transaction(async (tx) => {
			const [items, total] = await Promise.all([
				tx.meeting.findMany({
					where,
					orderBy: [{ date: "desc" }, { createdAt: "desc" }],
					skip: (filter.page - 1) * filter.limit,
					take: filter.limit,
					include: {
						attendees: { select: { presentAt: true } },
						_count: { select: { assignments: true } },
					},
				}),
				tx.meeting.count({ where }),
			]);

			return { items, total };
		});
	},
};

export type MeetingsRepository = typeof meetingsRepository;
