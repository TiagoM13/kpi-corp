import { MOCK_USERS, type MockUser } from "./users";

type MemberScore = {
	points: number;
	streak: number;
	trend: number[];
	stagnantDays?: number;
};

export type Member = MockUser & MemberScore;

const SCORES: Record<string, MemberScore> = {
	u1: { points: 1840, streak: 14, trend: [12, 18, 8, 22, 16, 30, 24] },
	u2: { points: 1620, streak: 9, trend: [10, 14, 22, 18, 12, 28, 20] },
	u3: { points: 1485, streak: 21, trend: [18, 20, 24, 16, 22, 28, 30] },
	u4: { points: 1320, streak: 5, trend: [8, 12, 6, 14, 10, 18, 20] },
	u5: { points: 1260, streak: 11, trend: [14, 10, 18, 12, 22, 16, 24] },
	u6: { points: 1110, streak: 3, trend: [6, 8, 12, 16, 10, 14, 18] },
	u7: { points: 980, streak: 7, trend: [10, 12, 8, 16, 14, 18, 12] },
	u8: {
		points: 720,
		streak: 2,
		trend: [4, 6, 2, 8, 6, 4, 10],
		stagnantDays: 8,
	},
	u9: {
		points: 540,
		streak: 0,
		trend: [0, 2, 0, 0, 4, 0, 0],
		stagnantDays: 11,
	},
	u10: { points: 380, streak: 1, trend: [0, 4, 8, 6, 10, 8, 12] },
	u11: {
		points: 290,
		streak: 0,
		trend: [0, 0, 2, 0, 0, 4, 0],
		stagnantDays: 16,
	},
	u12: { points: 95, streak: 4, trend: [4, 6, 8, 12, 10, 14, 16] },
};

export const MOCK_MEMBERS: Member[] = MOCK_USERS.map((user) => {
	const score = SCORES[user.id];
	return score ? { ...user, ...score } : null;
})
	.filter((member) => member !== null)
	.sort((a, b) => b.points - a.points);

export function levelOf(points: number) {
	let level = 0;
	let base = 0;
	let step = 100;

	while (base + step <= points) {
		level += 1;
		base += step;
		step += 50;
	}

	return level;
}
