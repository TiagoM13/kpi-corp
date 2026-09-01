import type { User } from "@kpi-corp/db/prisma/generated/client";
import type { Role } from "@kpi-corp/db/prisma/generated/enums";

export type Member = {
	id: string;
	name: string;
	email: string;
	role: Role;
	position: string | null;
	active: boolean;
	createdAt: Date;
};

export type UserForMemberMapping = Pick<
	User,
	"id" | "name" | "email" | "role" | "position" | "active" | "createdAt"
>;

export function mapUserToMember(user: UserForMemberMapping): Member {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		position: user.position,
		active: user.active,
		createdAt: user.createdAt,
	};
}
