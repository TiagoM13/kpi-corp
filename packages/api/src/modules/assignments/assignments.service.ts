import {
	KpiInactiveError,
	KpiNotFoundError,
	MemberInactiveError,
	MemberNotFoundError,
} from "../../shared/errors/common.errors";
import { assertMembersActive } from "../../shared/guards";
import {
	type AssignmentHistoryItem,
	type KpiAssignment,
	mapAssignmentHistoryItem,
	mapKpiAssignment,
} from "../../shared/mappers";
import { dayEnd, dayStart } from "../../shared/time";
import {
	AssignmentAlreadyRevokedError,
	AssignmentNotFoundError,
} from "./assignments.errors";
import {
	type AssignmentsDbClient,
	type AssignmentWritableData,
	assignmentsRepository,
	type ListMemberAssignmentsFilter,
} from "./assignments.repository";

export type AssignKpiInput = {
	kpiId: string;
	userId: string;
	note?: string | null;
};

export type ListAssignmentsInput = ListMemberAssignmentsFilter & {
	userId?: string;
	kpiId?: string;
	from?: string;
	to?: string;
	page: number;
	limit: number;
};

export type AssignmentHistoryPage = {
	items: AssignmentHistoryItem[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type BulkAssignKpisInput = {
	kpiId: string;
	userIds: string[];
	note?: string | null;
};

async function assertKpiAssignable(kpiId: string, db?: AssignmentsDbClient) {
	const kpi = await assignmentsRepository.findKpiById(kpiId, db);

	if (!kpi) {
		throw new KpiNotFoundError();
	}

	if (!kpi.active) {
		throw new KpiInactiveError();
	}

	return kpi;
}

async function assertMemberAssignable(userId: string) {
	const user = await assignmentsRepository.findUserById(userId);

	if (!user) {
		throw new MemberNotFoundError();
	}

	if (!user.active) {
		throw new MemberInactiveError();
	}
}

function writableFrom(
	input: AssignKpiInput,
	assignedBy: string,
	points: number,
): AssignmentWritableData {
	return {
		kpiId: input.kpiId,
		userId: input.userId,
		assignedBy,
		note: input.note ?? null,
		points,
	};
}

export const assignmentsService = {
	async assign(
		input: AssignKpiInput,
		assignedBy: string,
	): Promise<KpiAssignment> {
		const kpi = await assertKpiAssignable(input.kpiId);
		await assertMemberAssignable(input.userId);

		const assignment = await assignmentsRepository.create(
			writableFrom(input, assignedBy, kpi.points),
		);

		return mapKpiAssignment(assignment);
	},

	async bulkAssign(
		input: BulkAssignKpisInput,
		assignedBy: string,
	): Promise<KpiAssignment[]> {
		return assignmentsRepository.transaction(async (tx) => {
			const kpi = await assertKpiAssignable(input.kpiId, tx);
			const users = await assignmentsRepository.findUsersByIds(
				input.userIds,
				tx,
			);
			assertMembersActive(input.userIds, users);

			const assignments = await assignmentsRepository.createMany(
				input.userIds.map((userId) =>
					writableFrom({ ...input, userId }, assignedBy, kpi.points),
				),
				tx,
			);

			return assignments.map(mapKpiAssignment);
		});
	},

	async listByMember(
		userId: string,
		filter: ListMemberAssignmentsFilter,
	): Promise<{ items: KpiAssignment[] }> {
		const assignments = await assignmentsRepository.listByUser(userId, filter);

		return { items: assignments.map(mapKpiAssignment) };
	},

	async list(input: ListAssignmentsInput): Promise<AssignmentHistoryPage> {
		const { items, total } = await assignmentsRepository.list({
			userId: input.userId,
			kpiId: input.kpiId,
			category: input.category,
			revoked: input.revoked,
			from: input.from ? dayStart(input.from) : undefined,
			to: input.to ? dayEnd(input.to) : undefined,
			page: input.page,
			limit: input.limit,
		});

		return {
			items: items.map(mapAssignmentHistoryItem),
			page: input.page,
			limit: input.limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / input.limit)),
		};
	},

	async revoke(id: string): Promise<KpiAssignment> {
		const assignment = await assignmentsRepository.findById(id);

		if (!assignment) {
			throw new AssignmentNotFoundError();
		}

		if (assignment.revokedAt) {
			throw new AssignmentAlreadyRevokedError();
		}

		return mapKpiAssignment(await assignmentsRepository.revoke(id, new Date()));
	},
};

export type AssignmentsService = typeof assignmentsService;
