import type { User } from "@kpi-corp/db/prisma/generated/client";
import type { Role } from "@kpi-corp/db/prisma/generated/enums";

export type AuthUser = {
	id: string;
	name: string;
	email: string;
	role: Role;
	position: string | null;
	active: boolean;
};

export type PublicUser = {
	id: string;
	name: string;
	email: string;
	role: Role;
	position: string | null;
};

export type UserForAuthMapping = Pick<
	User,
	"id" | "name" | "email" | "role" | "position" | "active"
>;

export function mapUserToAuthUser(user: UserForAuthMapping): AuthUser {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		position: user.position,
		active: user.active,
	};
}

export type UserForPublicMapping = Pick<
	User,
	"id" | "name" | "email" | "role" | "position"
>;

export function mapUserToPublicUser(user: UserForPublicMapping): PublicUser {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		position: user.position,
	};
}
