import type { User as PrismaUser } from "@kpi-corp/db/prisma/generated/client";

export type DashboardMember = {
	id: string;
	name: string;
	position: string | null;
	role: PrismaUser["role"];
};

export function mapDashboardMember(
	user: Pick<PrismaUser, "id" | "name" | "position" | "role">,
): DashboardMember {
	return {
		id: user.id,
		name: user.name,
		position: user.position,
		role: user.role,
	};
}
