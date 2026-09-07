import { describe, expect, it } from "vitest";

import {
	LEVEL_THRESHOLDS,
	levelFor,
	MAX_LEVEL,
	MAX_POINTS,
	tierFor,
} from "../../../modules/profile/profile.levels";

describe("levelFor", () => {
	it("returns level 0 with no points", () => {
		expect(levelFor(0)).toMatchObject({
			level: 0,
			tier: "INICIANTE",
			currentPoints: 0,
			levelFloor: 0,
			nextLevel: 1,
			nextLevelPoints: 100,
			progress: 0,
			nextTier: "INICIANTE",
		});
	});

	it.each(
		LEVEL_THRESHOLDS.map((threshold, level) => [level, threshold] as const),
	)("reaches level %i at exactly %i points", (level, threshold) => {
		expect(levelFor(threshold).level).toBe(level);
	});

	it.each(
		LEVEL_THRESHOLDS.slice(1).map(
			(threshold, index) => [index + 1, threshold] as const,
		),
	)("stays one level below at %i - 1 points", (level, threshold) => {
		expect(levelFor(threshold - 1).level).toBe(level - 1);
	});

	it.each([
		[4, "INICIANTE"],
		[5, "COMPROMETIDO"],
		[9, "COMPROMETIDO"],
		[10, "DESTAQUE"],
		[14, "DESTAQUE"],
		[15, "ELITE"],
		[19, "ELITE"],
		[20, "LENDA"],
	] as const)("maps level %i to tier %s", (level, tier) => {
		expect(tierFor(level)).toBe(tier);
		expect(levelFor(LEVEL_THRESHOLDS[level]).tier).toBe(tier);
	});

	it("has zero progress at the level floor", () => {
		expect(levelFor(500).progress).toBe(0);
		expect(levelFor(3500).progress).toBe(0);
	});

	it("is almost complete one point before the next level", () => {
		expect(levelFor(699).progress).toBe(99);
		expect(levelFor(1899).progress).toBe(99);
	});

	it("keeps the max level above the cap", () => {
		const info = levelFor(MAX_POINTS + 1000);

		expect(info.level).toBe(MAX_LEVEL);
		expect(info.tier).toBe("LENDA");
		expect(info.nextLevel).toBeNull();
		expect(info.nextLevelPoints).toBeNull();
		expect(info.nextTier).toBeNull();
		expect(info.progress).toBe(100);
	});

	it("resolves a score between thresholds", () => {
		expect(levelFor(600)).toMatchObject({ level: 5, levelFloor: 500 });
	});
});
