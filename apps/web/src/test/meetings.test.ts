import { describe, expect, it } from "vitest";

import {
	activeAssignments,
	calendarDateOf,
	formatDuration,
	lastActiveAssignment,
	type MeetingAssignment,
	type MeetingDetail,
	presentAttendees,
} from "@/lib/meetings";

function assignment(
	id: string,
	assignedAt: string,
	revoked = false,
): MeetingAssignment {
	return {
		id,
		kpiId: "k",
		userId: "u",
		assignedBy: "admin",
		meetingId: "m",
		note: null,
		points: 5,
		revokedAt: revoked ? new Date() : null,
		assignedAt: new Date(assignedAt),
		kpi: { id: "k", name: "KPI", category: "PRESENCE" },
	};
}

const MEETING: MeetingDetail = {
	id: "m",
	title: "Daily",
	date: new Date("2026-09-25T00:00:00.000Z"),
	status: "OPEN",
	closedAt: null,
	createdAt: new Date(),
	createdBy: { id: "admin", name: "Admin" },
	attendees: [
		{ userId: "a", name: "Ana", position: "Dev", presentAt: new Date() },
		{ userId: "b", name: "Bruno", position: null, presentAt: null },
	],
	assignments: [
		assignment("1", "2026-09-25T10:00:00.000Z"),
		assignment("2", "2026-09-25T10:05:00.000Z"),
		assignment("3", "2026-09-25T10:10:00.000Z", true),
	],
};

describe("calendarDateOf", () => {
	it("usa o dia local, não o UTC", () => {
		expect(calendarDateOf(new Date(2026, 8, 5, 23, 30))).toBe("2026-09-05");
	});
});

describe("presentAttendees", () => {
	it("deixa de fora quem foi escalado e não chegou", () => {
		expect(presentAttendees(MEETING).map((person) => person.id)).toStrictEqual([
			"a",
		]);
	});
});

describe("activeAssignments e lastActiveAssignment", () => {
	it("ignora o que foi revogado", () => {
		expect(activeAssignments(MEETING).map((item) => item.id)).toStrictEqual([
			"1",
			"2",
		]);
	});

	it("desfaz o mais recente ainda valendo", () => {
		expect(lastActiveAssignment(MEETING)?.id).toBe("2");
	});

	it("não tem o que desfazer numa reunião sem atribuição", () => {
		expect(lastActiveAssignment({ ...MEETING, assignments: [] })).toBeNull();
	});
});

describe("formatDuration", () => {
	it.each([
		[0, "00:00"],
		[65, "01:05"],
		[3725, "1:02:05"],
	])("%i segundos viram %s", (seconds, expected) => {
		const from = new Date("2026-09-25T10:00:00.000Z");
		expect(
			formatDuration(from, new Date(from.getTime() + seconds * 1000)),
		).toBe(expected);
	});
});
