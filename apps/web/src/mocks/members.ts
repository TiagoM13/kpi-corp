import { MOCK_USERS, type MockUser } from "./users";

type MemberProfile = {
	points: number;
	monthPoints: number;
	streak: number;
	trend: number[];
	joinedAt: string;
	rankChange: number;
	stagnantDays?: number;
};

export type Member = MockUser & MemberProfile;

const PROFILES: Record<string, MemberProfile> = {
	u1: {
		points: 1840,
		monthPoints: 480,
		streak: 14,
		trend: [12, 18, 8, 22, 16, 30, 24],
		joinedAt: "2023-04-12",
		rankChange: 0,
	},
	u2: {
		points: 1620,
		monthPoints: 460,
		streak: 9,
		trend: [10, 14, 22, 18, 12, 28, 20],
		joinedAt: "2023-09-01",
		rankChange: 0,
	},
	u3: {
		points: 1485,
		monthPoints: 520,
		streak: 21,
		trend: [18, 20, 24, 16, 22, 28, 30],
		joinedAt: "2024-01-22",
		rankChange: 2,
	},
	u4: {
		points: 1320,
		monthPoints: 330,
		streak: 5,
		trend: [8, 12, 6, 14, 10, 18, 20],
		joinedAt: "2024-02-18",
		rankChange: 1,
	},
	u5: {
		points: 1260,
		monthPoints: 420,
		streak: 11,
		trend: [14, 10, 18, 12, 22, 16, 24],
		joinedAt: "2023-11-04",
		rankChange: -1,
	},
	u6: {
		points: 1110,
		monthPoints: 290,
		streak: 3,
		trend: [6, 8, 12, 16, 10, 14, 18],
		joinedAt: "2024-05-30",
		rankChange: 0,
	},
	u7: {
		points: 980,
		monthPoints: 300,
		streak: 7,
		trend: [10, 12, 8, 16, 14, 18, 12],
		joinedAt: "2024-03-11",
		rankChange: 1,
	},
	u8: {
		points: 720,
		monthPoints: 140,
		streak: 2,
		trend: [4, 6, 2, 8, 6, 4, 10],
		joinedAt: "2025-01-08",
		rankChange: -2,
		stagnantDays: 8,
	},
	u9: {
		points: 540,
		monthPoints: 40,
		streak: 0,
		trend: [0, 2, 0, 0, 4, 0, 0],
		joinedAt: "2025-02-14",
		rankChange: 0,
		stagnantDays: 11,
	},
	u10: {
		points: 380,
		monthPoints: 180,
		streak: 1,
		trend: [0, 4, 8, 6, 10, 8, 12],
		joinedAt: "2025-03-04",
		rankChange: 3,
	},
	u11: {
		points: 290,
		monthPoints: 30,
		streak: 0,
		trend: [0, 0, 2, 0, 0, 4, 0],
		joinedAt: "2025-03-22",
		rankChange: -1,
		stagnantDays: 16,
	},
	u12: {
		points: 95,
		monthPoints: 260,
		streak: 4,
		trend: [4, 6, 8, 12, 10, 14, 16],
		joinedAt: "2026-02-01",
		rankChange: 4,
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
