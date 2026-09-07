import { adminProcedure } from "../../index";
import { handle } from "../../shared/errors/handle";
import {
	assignKpiInputSchema,
	assignmentIdInputSchema,
	bulkAssignKpisInputSchema,
	kpiAssignmentResponseSchema,
	listKpiAssignmentsResponseSchema,
	listMemberKpiAssignmentsInputSchema,
} from "./assignments.schema";
import { assignmentsService } from "./assignments.service";

export const assignmentsRouter = {
	assign: adminProcedure
		.route({ method: "POST", path: "/kpi-assignments" })
		.input(assignKpiInputSchema)
		.output(kpiAssignmentResponseSchema)
		.handler(({ input, context }) =>
			handle(() => assignmentsService.assign(input, context.auth.userId)),
		),

	bulkAssign: adminProcedure
		.route({ method: "POST", path: "/kpi-assignments/bulk" })
		.input(bulkAssignKpisInputSchema)
		.output(listKpiAssignmentsResponseSchema)
		.handler(({ input, context }) =>
			handle(async () => {
				const items = await assignmentsService.bulkAssign(
					input,
					context.auth.userId,
				);

				return { items };
			}),
		),

	listByMember: adminProcedure
		.route({ method: "GET", path: "/members/{id}/kpi-assignments" })
		.input(listMemberKpiAssignmentsInputSchema)
		.output(listKpiAssignmentsResponseSchema)
		.handler(({ input }) =>
			handle(() =>
				assignmentsService.listByMember(input.id, {
					category: input.category,
					revoked: input.revoked,
				}),
			),
		),

	revoke: adminProcedure
		.route({ method: "DELETE", path: "/kpi-assignments/{id}" })
		.input(assignmentIdInputSchema)
		.output(kpiAssignmentResponseSchema)
		.handler(({ input }) => handle(() => assignmentsService.revoke(input.id))),
};
