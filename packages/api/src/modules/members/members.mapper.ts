import type { User } from "@kpi-corp/db/prisma/generated/client";
import type { Role } from "@kpi-corp/db/prisma/generated/enums";
import { type LevelInfo, levelFor } from "../../shared/gamification";

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

export type MemberScore = {
	points: number;
	kpiCount: number;
	lastAssignmentAt: Date | null;
};

export type MemberListItem = Member &
	MemberScore & {
		level: LevelInfo;
	};

const NO_SCORE: MemberScore = {
	points: 0,
	kpiCount: 0,
	lastAssignmentAt: null,
};

export function mapUserToMemberListItem(
	user: UserForMemberMapping,
	score: MemberScore = NO_SCORE,
): MemberListItem {
	return {
		...mapUserToMember(user),
		points: score.points,
		kpiCount: score.kpiCount,
		lastAssignmentAt: score.lastAssignmentAt,
		level: levelFor(score.points),
	};
}
