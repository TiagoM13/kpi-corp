import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MeetingDetail } from "@/lib/meetings";
import { orpc } from "@/utils/orpc";

export function useMeeting(meetingId: string) {
	return useQuery(
		orpc.meetings.getById.queryOptions({ input: { id: meetingId } }),
	);
}

function useMeetingCache(meetingId: string) {
	const queryClient = useQueryClient();
	const queryKey = orpc.meetings.getById.queryKey({
		input: { id: meetingId },
	});

	return {
		store: (meeting: MeetingDetail) =>
			queryClient.setQueryData(queryKey, meeting),
		refresh: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey }),
				queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() }),
				queryClient.invalidateQueries({ queryKey: orpc.meetings.list.key() }),
			]),
	};
}

export type StartMeetingInput = {
	title: string;
	date: string;
	userIds: string[];
	presenceKpiId: string;
};

export type StartMeetingResult = {
	meetingId: string;
	attendanceError: unknown;
};

export function useStartMeeting() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			title,
			date,
			userIds,
			presenceKpiId,
		}: StartMeetingInput): Promise<StartMeetingResult> => {
			const meeting = await orpc.meetings.create.call({ title, date });

			try {
				const withAttendance = await orpc.meetings.registerAttendance.call({
					id: meeting.id,
					userIds,
					kpiId: presenceKpiId,
				});
				queryClient.setQueryData(
					orpc.meetings.getById.queryKey({ input: { id: meeting.id } }),
					withAttendance,
				);
				return { meetingId: meeting.id, attendanceError: null };
			} catch (attendanceError) {
				return { meetingId: meeting.id, attendanceError };
			}
		},
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() }),
				queryClient.invalidateQueries({ queryKey: orpc.meetings.list.key() }),
			]),
	});
}

export function useRegisterAttendance(meetingId: string) {
	const cache = useMeetingCache(meetingId);

	return useMutation({
		mutationFn: (input: { userIds: string[]; presenceKpiId: string }) =>
			orpc.meetings.registerAttendance.call({
				id: meetingId,
				userIds: input.userIds,
				kpiId: input.presenceKpiId,
			}),
		onSuccess: (meeting) => {
			cache.store(meeting);
			return cache.refresh();
		},
	});
}

export function useAssignMeetingKpi(meetingId: string) {
	const cache = useMeetingCache(meetingId);

	return useMutation({
		mutationFn: (input: { kpiId: string; userId: string }) =>
			orpc.meetings.assignKpi.call({ id: meetingId, ...input }),
		onSuccess: () => cache.refresh(),
	});
}

export function useRevokeMeetingAssignment(meetingId: string) {
	const cache = useMeetingCache(meetingId);

	return useMutation({
		mutationFn: (assignmentId: string) =>
			orpc.assignments.revoke.call({ id: assignmentId }),
		onSuccess: () => cache.refresh(),
	});
}

export function useEndMeeting(meetingId: string) {
	const cache = useMeetingCache(meetingId);

	return useMutation({
		mutationFn: () => orpc.meetings.end.call({ id: meetingId }),
		onSuccess: (meeting) => {
			cache.store(meeting);
			return cache.refresh();
		},
	});
}
