import {
	KpiInactiveError,
	KpiNotFoundError,
} from "../../shared/errors/common.errors";
import { assertMembersActive } from "../../shared/guards";
import { type KpiAssignment, mapKpiAssignment } from "../../shared/mappers";
import {
	AttendeeNotPresentError,
	KpiNotPresenceError,
	MeetingAlreadyClosedError,
	MeetingClosedError,
	MeetingNotFoundError,
} from "./meetings.errors";
import {
	type MeetingDetail,
	mapMeetingDetail,
	mapMeetingListItem,
} from "./meetings.mapper";
import {
	type ListMeetingsFilter,
	type MeetingsDbClient,
	meetingsRepository,
} from "./meetings.repository";

export type CreateMeetingInput = {
	title: string;
	date: Date;
};

export type RegisterAttendanceInput = {
	userIds: string[];
	kpiId: string;
};

export type AssignMeetingKpiInput = {
	kpiId: string;
	userId: string;
	note?: string | null;
};

export type ListMeetingsInput = ListMeetingsFilter;

async function getDetail(
	id: string,
	db?: MeetingsDbClient,
): Promise<MeetingDetail> {
	const meeting = await meetingsRepository.findDetailById(id, db);

	if (!meeting) {
		throw new MeetingNotFoundError();
	}

	const creator = await meetingsRepository.findCreator(meeting.createdBy, db);

	if (!creator) {
		throw new Error(`Meeting ${id} creator ${meeting.createdBy} not found`);
	}

	return mapMeetingDetail(meeting, creator);
}

async function findOpenMeetingOrThrow(id: string, db: MeetingsDbClient) {
	await meetingsRepository.lockForUpdate(id, db);

	const meeting = await meetingsRepository.findById(id, db);

	if (!meeting) {
		throw new MeetingNotFoundError();
	}

	if (meeting.closedAt) {
		throw new MeetingClosedError();
	}

	return meeting;
}

export const meetingsService = {
	async create(
		input: CreateMeetingInput,
		createdBy: string,
	): Promise<MeetingDetail> {
		const meeting = await meetingsRepository.create({
			title: input.title,
			date: input.date,
			createdBy,
		});

		return getDetail(meeting.id);
	},

	async getById(id: string): Promise<MeetingDetail> {
		return getDetail(id);
	},

	async addAttendees(id: string, userIds: string[]): Promise<MeetingDetail> {
		return meetingsRepository.transaction(async (tx) => {
			await findOpenMeetingOrThrow(id, tx);

			const users = await meetingsRepository.findUsersByIds(userIds, tx);
			assertMembersActive(userIds, users);

			await meetingsRepository.addAttendees(id, userIds, tx);

			return getDetail(id, tx);
		});
	},

	async registerAttendance(
		id: string,
		input: RegisterAttendanceInput,
		assignedBy: string,
	): Promise<MeetingDetail> {
		return meetingsRepository.transaction(async (tx) => {
			await findOpenMeetingOrThrow(id, tx);

			const kpi = await meetingsRepository.findKpiById(input.kpiId, tx);

			if (!kpi) {
				throw new KpiNotFoundError();
			}

			if (!kpi.active) {
				throw new KpiInactiveError();
			}

			if (kpi.category !== "PRESENCE") {
				throw new KpiNotPresenceError();
			}

			const users = await meetingsRepository.findUsersByIds(input.userIds, tx);
			assertMembersActive(input.userIds, users);

			const attendees = await meetingsRepository.findAttendees(
				id,
				input.userIds,
				tx,
			);
			const alreadyPresent = new Set(
				attendees
					.filter((attendee) => attendee.presentAt !== null)
					.map((attendee) => attendee.userId),
			);
			// Presente confirmado duas vezes nao dobra pontuacao: quem ja
			// tinha presentAt sai da lista antes da escrita.
			const toStamp = input.userIds.filter(
				(userId) => !alreadyPresent.has(userId),
			);

			if (toStamp.length > 0) {
				const presentAt = new Date();

				await meetingsRepository.createPresentAttendees(
					id,
					toStamp,
					presentAt,
					tx,
				);
				await meetingsRepository.markAttendeesPresent(
					id,
					toStamp,
					presentAt,
					tx,
				);
				await meetingsRepository.createAssignments(
					toStamp.map((userId) => ({
						kpiId: kpi.id,
						userId,
						assignedBy,
						meetingId: id,
						note: null,
						points: kpi.points,
					})),
					tx,
				);
			}

			return getDetail(id, tx);
		});
	},

	async assignKpi(
		id: string,
		input: AssignMeetingKpiInput,
		assignedBy: string,
	): Promise<KpiAssignment> {
		return meetingsRepository.transaction(async (tx) => {
			await findOpenMeetingOrThrow(id, tx);

			const attendee = await meetingsRepository.findAttendee(
				id,
				input.userId,
				tx,
			);

			if (!attendee || attendee.presentAt === null) {
				throw new AttendeeNotPresentError();
			}

			const users = await meetingsRepository.findUsersByIds([input.userId], tx);
			assertMembersActive([input.userId], users);

			const kpi = await meetingsRepository.findKpiById(input.kpiId, tx);

			if (!kpi) {
				throw new KpiNotFoundError();
			}

			if (!kpi.active) {
				throw new KpiInactiveError();
			}

			const assignment = await meetingsRepository.createAssignment(
				{
					kpiId: kpi.id,
					userId: input.userId,
					assignedBy,
					meetingId: id,
					note: input.note ?? null,
					points: kpi.points,
				},
				tx,
			);

			return mapKpiAssignment(assignment);
		});
	},

	async end(id: string): Promise<MeetingDetail> {
		return meetingsRepository.transaction(async (tx) => {
			await meetingsRepository.lockForUpdate(id, tx);

			const meeting = await meetingsRepository.findById(id, tx);

			if (!meeting) {
				throw new MeetingNotFoundError();
			}

			if (meeting.closedAt) {
				throw new MeetingAlreadyClosedError();
			}

			await meetingsRepository.close(id, new Date(), tx);

			return getDetail(id, tx);
		});
	},

	async list(input: ListMeetingsInput) {
		const { items, total } = await meetingsRepository.list(input);

		return {
			items: items.map(mapMeetingListItem),
			page: input.page,
			limit: input.limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / input.limit)),
		};
	},
};

export type MeetingsService = typeof meetingsService;
