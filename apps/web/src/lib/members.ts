import type { AppRouterClient } from "@kpi-corp/api/routers/index";
import { domainCodeOf } from "@/lib/auth";
import {
	API_KPI_CATEGORIES,
	type ApiKpiCategory,
	categoryOfApi,
} from "@/lib/categories";
import type { CategoryShare, MemberAchievements } from "@/lib/member-stats";
import type { AchievementRarity } from "@/mocks/badges";
import { client } from "@/utils/orpc";

type MembersClient = AppRouterClient["members"];
type ProfileClient = AppRouterClient["profile"];

export type MemberListItem = Awaited<
	ReturnType<MembersClient["list"]>
>["items"][number];

export type MemberProfile = Awaited<
	ReturnType<ProfileClient["getPublicProfile"]>
>;

export type ProfileKpi = MemberProfile["kpis"][number];

export const MEMBERS_PAGE_SIZE = 20;
export const MAX_INVITES_PER_REQUEST = 50;

export type MemberStatus =
	| { kind: "INACTIVE" }
	| { kind: "STAGNANT"; days: number }
	| { kind: "ACTIVE" };

export function memberStatusOf(
	member: Pick<MemberListItem, "active" | "stagnant" | "daysWithoutKpi">,
): MemberStatus {
	if (!member.active) {
		return { kind: "INACTIVE" };
	}

	if (member.stagnant) {
		return { kind: "STAGNANT", days: member.daysWithoutKpi };
	}

	return { kind: "ACTIVE" };
}

export function streakWeeksOf(badges: MemberProfile["badges"]): number {
	return badges.find((item) => item.code === "FOUR_WEEK_STREAK")?.current ?? 0;
}

type ScoreKey = keyof MemberProfile["categories"];

const SCORE_KEY_OF_API: Record<ApiKpiCategory, ScoreKey> = {
	PRESENCE: "presence",
	PERFORMANCE: "performance",
	BEHAVIOR: "behavior",
	INITIATIVE: "initiative",
};

export function categorySharesOf(
	categories: MemberProfile["categories"],
): CategoryShare[] {
	const positive = API_KPI_CATEGORIES.map((category) =>
		Math.max(categories[SCORE_KEY_OF_API[category]], 0),
	);
	const total = positive.reduce((sum, points) => sum + points, 0);

	return API_KPI_CATEGORIES.map((category, index) => {
		const points = positive[index] ?? 0;
		return {
			category: categoryOfApi(category),
			points,
			percent: total === 0 ? 0 : (points / total) * 100,
		};
	});
}

const RARITY_OF_API: Record<
	MemberProfile["badges"][number]["rarity"],
	AchievementRarity
> = {
	COMUM: "comum",
	RARA: "rara",
	EPICA: "épica",
	LENDARIA: "lendária",
};

export function achievementsOfProfile(
	badges: MemberProfile["badges"],
): MemberAchievements {
	const available = badges.filter((badge) => badge.available);
	const toAchievement = (badge: MemberProfile["badges"][number]) => ({
		id: badge.code,
		name: badge.name,
		description: badge.description,
		rarity: RARITY_OF_API[badge.rarity],
		icon: badge.icon,
		earnedBy: [],
	});

	return {
		earned: available.filter((badge) => badge.earned).map(toAchievement),
		locked: available.filter((badge) => !badge.earned).map(toAchievement),
		total: available.length,
	};
}

export type InviteOutcome = {
	created: string[];
	alreadyRegistered: string[];
	failed: string[];
};

export async function inviteMembers(emails: string[]): Promise<InviteOutcome> {
	const response = await client.members.invite({ emails });

	return {
		created: response.created.map((invite) => invite.email),
		alreadyRegistered: response.failed
			.filter((failure) => failure.code === "EMAIL_ALREADY_REGISTERED")
			.map((failure) => failure.email),
		failed: response.failed
			.filter((failure) => failure.code !== "EMAIL_ALREADY_REGISTERED")
			.map((failure) => failure.email),
	};
}

const STATUS_ERROR_BY_CODE: Record<string, string> = {
	CANNOT_DEACTIVATE_SELF: "Você não pode desativar a própria conta.",
	LAST_ADMIN_CANNOT_BE_DEACTIVATED:
		"Este é o último admin ativo. Ative outro admin antes de desativar este.",
	MEMBER_NOT_FOUND: "Este membro não existe mais. Atualize a lista.",
};

export function memberStatusErrorOf(error: unknown) {
	return (
		STATUS_ERROR_BY_CODE[domainCodeOf(error) ?? ""] ??
		"Não deu para mudar o acesso do membro. Tente de novo."
	);
}
