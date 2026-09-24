import {
	MemberInactiveError,
	MemberNotFoundError,
} from "../errors/common.errors";

export function assertMembersActive(
	userIds: string[],
	users: { id: string; active: boolean }[],
) {
	const byId = new Map(users.map((user) => [user.id, user]));

	for (const userId of userIds) {
		const user = byId.get(userId);

		if (!user) {
			throw new MemberNotFoundError();
		}

		if (!user.active) {
			throw new MemberInactiveError();
		}
	}
}
