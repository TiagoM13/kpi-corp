import { MOCK_USERS, type MockUser } from "./users";

type MemberProfile = {
	points: number;
	streak: number;
	trend: number[];
	joinedAt: string;
	stagnantDays?: number;
};

export type Member = MockUser & MemberProfile;

const PROFILES: Record<string, MemberProfile> = {
	u1: {
		points: 1840,
		streak: 14,
		trend: [12, 18, 8, 22, 16, 30, 24],
		joinedAt: "2023-04-12",
	},
	u2: {
		points: 1620,
		streak: 9,
		trend: [10, 14, 22, 18, 12, 28, 20],
		joinedAt: "2023-09-01",
	},
	u3: {
		points: 1485,
		streak: 21,
		trend: [18, 20, 24, 16, 22, 28, 30],
		joinedAt: "2024-01-22",
	},
	u4: {
		points: 1320,
		streak: 5,
		trend: [8, 12, 6, 14, 10, 18, 20],
		joinedAt: "2024-02-18",
	},
	u5: {
		points: 1260,
		streak: 11,
		trend: [14, 10, 18, 12, 22, 16, 24],
		joinedAt: "2023-11-04",
	},
	u6: {
		points: 1110,
		streak: 3,
		trend: [6, 8, 12, 16, 10, 14, 18],
		joinedAt: "2024-05-30",
	},
	u7: {
		points: 980,
		streak: 7,
		trend: [10, 12, 8, 16, 14, 18, 12],
		joinedAt: "2024-03-11",
	},
	u8: {
		points: 720,
		streak: 2,
		trend: [4, 6, 2, 8, 6, 4, 10],
		joinedAt: "2025-01-08",
		stagnantDays: 8,
	},
	u9: {
		points: 540,
		streak: 0,
		trend: [0, 2, 0, 0, 4, 0, 0],
		joinedAt: "2025-02-14",
		stagnantDays: 11,
	},
	u10: {
		points: 380,
		streak: 1,
		trend: [0, 4, 8, 6, 10, 8, 12],
		joinedAt: "2025-03-04",
	},
	u11: {
		points: 290,
		streak: 0,
		trend: [0, 0, 2, 0, 0, 4, 0],
		joinedAt: "2025-03-22",
		stagnantDays: 16,
	},
	u12: {
		points: 95,
		streak: 4,
		trend: [4, 6, 8, 12, 10, 14, 16],
		joinedAt: "2026-02-01",
	},
};

export const MOCK_MEMBERS: Member[] = MOCK_USERS.map((user) => {
	const profile = PROFILES[user.id];
	return profile ? { ...user, ...profile } : null;
})
	.filter((member) => member !== null)
	.sort((a, b) => b.points - a.points);

export const MEMBER_BY_ID = new Map(
	MOCK_MEMBERS.map((member) => [member.id, member]),
);
