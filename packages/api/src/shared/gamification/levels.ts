export const MAX_LEVEL = 20;

export const LEVEL_THRESHOLDS = [
	0, 100, 200, 300, 400, 500, 700, 900, 1100, 1300, 1500, 1900, 2300, 2700,
	3100, 3500, 4300, 5100, 5900, 6700, 7500,
] as const;

export const MAX_POINTS = LEVEL_THRESHOLDS[MAX_LEVEL];

export type LevelTier =
	| "INICIANTE"
	| "COMPROMETIDO"
	| "DESTAQUE"
	| "ELITE"
	| "LENDA";

export type LevelInfo = {
	level: number;
	tier: LevelTier;
	currentPoints: number;
	levelFloor: number;
	nextLevel: number | null;
	nextLevelPoints: number | null;
	progress: number;
	nextTier: LevelTier | null;
};

export function tierFor(level: number): LevelTier {
	if (level >= 15) {
		return level >= MAX_LEVEL ? "LENDA" : "ELITE";
	}

	if (level >= 10) {
		return "DESTAQUE";
	}

	if (level >= 5) {
		return "COMPROMETIDO";
	}

	return "INICIANTE";
}

function resolveLevel(points: number) {
	let level = 0;
	let levelFloor: number = LEVEL_THRESHOLDS[0];
	let nextLevel: number | null = null;
	let nextLevelPoints: number | null = null;

	for (const [index, threshold] of LEVEL_THRESHOLDS.entries()) {
		if (points >= threshold) {
			level = index;
			levelFloor = threshold;
		} else {
			nextLevel = index;
			nextLevelPoints = threshold;
			break;
		}
	}

	return { level, levelFloor, nextLevel, nextLevelPoints };
}

export function levelFor(points: number): LevelInfo {
	const scored = Math.max(points, 0);
	const { level, levelFloor, nextLevel, nextLevelPoints } =
		resolveLevel(scored);

	if (nextLevel === null || nextLevelPoints === null) {
		return {
			level,
			tier: tierFor(level),
			currentPoints: points,
			levelFloor,
			nextLevel: null,
			nextLevelPoints: null,
			progress: 100,
			nextTier: null,
		};
	}

	const progress = Math.floor(
		((scored - levelFloor) / (nextLevelPoints - levelFloor)) * 100,
	);

	return {
		level,
		tier: tierFor(level),
		currentPoints: points,
		levelFloor,
		nextLevel,
		nextLevelPoints,
		progress,
		nextTier: tierFor(nextLevel),
	};
}
