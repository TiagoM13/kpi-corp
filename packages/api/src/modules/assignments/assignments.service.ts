import {
	AssignmentAlreadyRevokedError,
	AssignmentNotFoundError,
	KpiInactiveError,
	KpiNotFoundError,
	MemberInactiveError,
	MemberNotFoundError,
} from "./assignments.errors";
import { type KpiAssignment, mapKpiAssignment } from "./assignments.mapper";
import {
	type AssignmentWritableData,
	assignmentsRepository,
	type ListMemberAssignmentsFilter,
} from "./assignments.repository";

export type AssignKpiInput = {
	kpiId: string;
	userId: string;
	note?: string | null;
};

export type BulkAssignKpisInput = {
	kpiId: string;
	userIds: string[];
	note?: string | null;
};

async function assertKpiAssignable(kpiId: string) {
	const kpi = await assignmentsRepository.findKpiById(kpiId);

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
		const kpi = await assertKpiAssignable(input.kpiId);
		await Promise.all(input.userIds.map(assertMemberAssignable));

		const assignments = await assignmentsRepository.createMany(
			input.userIds.map((userId) =>
				writableFrom({ ...input, userId }, assignedBy, kpi.points),
			),
		);

		return assignments.map(mapKpiAssignment);
	},

	async listByMember(
		userId: string,
		filter: ListMemberAssignmentsFilter,
	): Promise<{ items: KpiAssignment[] }> {
		const assignments = await assignmentsRepository.listByUser(userId, filter);

		return { items: assignments.map(mapKpiAssignment) };
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
