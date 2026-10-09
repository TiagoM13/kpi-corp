import { adminProcedure } from "../../index";
import { handle } from "../../shared/errors/handle";
import {
	inviteMembersInputSchema,
	inviteMembersResponseSchema,
	listMembersInputSchema,
	listMembersResponseSchema,
	memberIdInputSchema,
	memberResponseSchema,
	setMemberStatusInputSchema,
} from "./members.schema";
import { membersService } from "./members.service";

export const membersRouter = {
	list: adminProcedure
		.route({ method: "GET", path: "/members" })
		.input(listMembersInputSchema)
		.output(listMembersResponseSchema)
		.handler(({ input }) => handle(() => membersService.list(input))),

	getById: adminProcedure
		.route({ method: "GET", path: "/members/{id}" })
		.input(memberIdInputSchema)
		.output(memberResponseSchema)
		.handler(({ input }) => handle(() => membersService.getById(input.id))),

	invite: adminProcedure
		.route({ method: "POST", path: "/members/invitations" })
		.input(inviteMembersInputSchema)
		.output(inviteMembersResponseSchema)
		.handler(({ input }) => handle(() => membersService.invite(input.emails))),

	setStatus: adminProcedure
		.route({ method: "PATCH", path: "/members/{id}/status" })
		.input(setMemberStatusInputSchema)
		.output(memberResponseSchema)
		.handler(({ input, context }) =>
			handle(() =>
				membersService.setStatus({
					id: input.id,
					active: input.active,
					requestedBy: context.auth.userId,
				}),
			),
		),
};
