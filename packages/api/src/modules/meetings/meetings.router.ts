import { adminProcedure } from "../../index";
import { handle } from "../../shared/errors/handle";
import {
	addAttendeesInputSchema,
	assignMeetingKpiInputSchema,
	createMeetingInputSchema,
	listMeetingsInputSchema,
	listMeetingsResponseSchema,
	meetingAssignmentSchema,
	meetingDetailSchema,
	meetingIdInputSchema,
	registerAttendanceInputSchema,
} from "./meetings.schema";
import { meetingsService } from "./meetings.service";

export const meetingsRouter = {
	create: adminProcedure
		.route({ method: "POST", path: "/meetings" })
		.input(createMeetingInputSchema)
		.output(meetingDetailSchema)
		.handler(({ input, context }) =>
			handle(() => meetingsService.create(input, context.auth.userId)),
		),

	list: adminProcedure
		.route({ method: "GET", path: "/meetings" })
		.input(listMeetingsInputSchema)
		.output(listMeetingsResponseSchema)
		.handler(({ input }) => handle(() => meetingsService.list(input))),

	getById: adminProcedure
		.route({ method: "GET", path: "/meetings/{id}" })
		.input(meetingIdInputSchema)
		.output(meetingDetailSchema)
		.handler(({ input }) => handle(() => meetingsService.getById(input.id))),

	addAttendees: adminProcedure
		.route({ method: "POST", path: "/meetings/{id}/attendees" })
		.input(addAttendeesInputSchema)
		.output(meetingDetailSchema)
		.handler(({ input }) =>
			handle(() => meetingsService.addAttendees(input.id, input.userIds)),
		),

	registerAttendance: adminProcedure
		.route({ method: "POST", path: "/meetings/{id}/attendance" })
		.input(registerAttendanceInputSchema)
		.output(meetingDetailSchema)
		.handler(({ input, context }) =>
			handle(() =>
				meetingsService.registerAttendance(
					input.id,
					{ userIds: input.userIds, kpiId: input.kpiId },
					context.auth.userId,
				),
			),
		),

	assignKpi: adminProcedure
		.route({ method: "POST", path: "/meetings/{id}/kpi-assignments" })
		.input(assignMeetingKpiInputSchema)
		.output(meetingAssignmentSchema)
		.handler(({ input, context }) =>
			handle(() =>
				meetingsService.assignKpi(
					input.id,
					{ kpiId: input.kpiId, userId: input.userId, note: input.note },
					context.auth.userId,
				),
			),
		),

	end: adminProcedure
		.route({ method: "POST", path: "/meetings/{id}/end" })
		.input(meetingIdInputSchema)
		.output(meetingDetailSchema)
		.handler(({ input }) => handle(() => meetingsService.end(input.id))),
};
