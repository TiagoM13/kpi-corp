import { describe, expect, it } from "vitest";

import {
	formatElapsed,
	INITIAL_MEETING,
	type MeetingState,
	meetingReducer,
	meetingSummary,
	pointsByMember,
} from "@/lib/meeting";
import { KPI_BY_ID } from "@/mocks/kpis";
import { MEMBER_BY_ID } from "@/mocks/members";

function kpi(id: string) {
	const found = KPI_BY_ID.get(id);
	if (!found) throw new Error(`kpi ${id} nao existe`);
	return found;
}

const PRESENCE = kpi("k1");
const IDEA = kpi("k3");

function withPresent(...ids: string[]): MeetingState {
	return ids.reduce(
		(state, memberId) =>
			meetingReducer(state, { type: "togglePresent", memberId }),
		INITIAL_MEETING,
	);
}

function live(...ids: string[]) {
	return meetingReducer(withPresent(...ids), {
		type: "start",
		presenceKpi: PRESENCE,
	});
}

describe("meetingReducer — presenca", () => {
	it("marca e desmarca a mesma pessoa", () => {
		const marked = withPresent("u1");
		expect(marked.present).toStrictEqual(["u1"]);

		const cleared = meetingReducer(marked, {
			type: "togglePresent",
			memberId: "u1",
		});
		expect(cleared.present).toStrictEqual([]);
	});

	it("marca todos e limpa", () => {
		const all = meetingReducer(INITIAL_MEETING, {
			type: "markAll",
			memberIds: ["u1", "u2", "u3"],
		});
		expect(all.present).toHaveLength(3);

		expect(meetingReducer(all, { type: "clearPresent" }).present).toStrictEqual(
			[],
		);
	});
});

describe("meetingReducer — inicio", () => {
	it("nao inicia sem ninguem presente", () => {
		const state = meetingReducer(INITIAL_MEETING, {
			type: "start",
			presenceKpi: PRESENCE,
		});

		expect(state.phase).toBe("setup");
		expect(state).toBe(INITIAL_MEETING);
	});

	it("da o KPI de presenca para cada presente", () => {
		const state = live("u1", "u2");

		expect(state.phase).toBe("live");
		expect(state.given).toHaveLength(2);
		expect(state.given.every((item) => item.kpiId === PRESENCE.id)).toBe(true);
		expect(state.given.every((item) => item.points === PRESENCE.points)).toBe(
			true,
		);
	});

	it("inicia sem atribuicoes quando nao existe KPI de presenca", () => {
		const state = meetingReducer(withPresent("u1"), { type: "start" });

		expect(state.phase).toBe("live");
		expect(state.given).toStrictEqual([]);
	});
});

describe("meetingReducer — atribuicao", () => {
	it("registra o KPI para quem esta presente", () => {
		const state = meetingReducer(live("u1"), {
			type: "give",
			memberId: "u1",
			kpi: IDEA,
		});

		expect(state.given).toHaveLength(2);
		expect(state.given.at(-1)).toMatchObject({
			memberId: "u1",
			kpiId: IDEA.id,
			points: IDEA.points,
		});
	});

	it("recusa quem nao esta presente", () => {
		const started = live("u1");
		const state = meetingReducer(started, {
			type: "give",
			memberId: "u9",
			kpi: IDEA,
		});

		expect(state).toBe(started);
	});

	it("recusa atribuicao fora da fase ao vivo", () => {
		const state = meetingReducer(withPresent("u1"), {
			type: "give",
			memberId: "u1",
			kpi: IDEA,
		});

		expect(state.given).toStrictEqual([]);
	});

	it("gera id proprio para cada atribuicao", () => {
		let state = live("u1", "u2");
		state = meetingReducer(state, { type: "give", memberId: "u1", kpi: IDEA });
		state = meetingReducer(state, { type: "give", memberId: "u1", kpi: IDEA });

		const ids = state.given.map((item) => item.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("meetingReducer — desfazer", () => {
	it("remove a ultima atribuicao", () => {
		let state = live("u1");
		state = meetingReducer(state, { type: "give", memberId: "u1", kpi: IDEA });
		state = meetingReducer(state, { type: "undo" });

		expect(state.given).toHaveLength(1);
		expect(state.given.at(-1)?.kpiId).toBe(PRESENCE.id);
	});

	it("nao quebra com a lista vazia", () => {
		const empty = meetingReducer(withPresent("u1"), { type: "start" });
		const state = meetingReducer(empty, { type: "undo" });

		expect(state).toBe(empty);
		expect(state.given).toStrictEqual([]);
	});
});

describe("meetingReducer — cronometro e fases", () => {
	it("so conta tempo ao vivo", () => {
		expect(meetingReducer(INITIAL_MEETING, { type: "tick" }).elapsed).toBe(0);
		expect(meetingReducer(live("u1"), { type: "tick" }).elapsed).toBe(1);
	});

	it("encerrar limpa o KPI selecionado", () => {
		let state = live("u1");
		state = meetingReducer(state, { type: "selectKpi", kpiId: IDEA.id });
		state = meetingReducer(state, { type: "end" });

		expect(state.phase).toBe("done");
		expect(state.selectedKpiId).toBeNull();
	});

	it("reiniciar zera tudo menos o titulo", () => {
		let state = meetingReducer(live("u1"), {
			type: "setTitle",
			title: "Retro",
		});
		state = meetingReducer(state, { type: "end" });
		state = meetingReducer(state, { type: "restart" });

		expect(state).toStrictEqual({ ...INITIAL_MEETING, title: "Retro" });
	});
});

describe("formatElapsed", () => {
	it.each([
		[0, "00:00"],
		[9, "00:09"],
		[60, "01:00"],
		[125, "02:05"],
		[3600, "60:00"],
		[-5, "00:00"],
	])("%i segundos viram %s", (seconds, expected) => {
		expect(formatElapsed(seconds)).toBe(expected);
	});
});

describe("meetingSummary", () => {
	it("soma por pessoa e ordena o podio", () => {
		let state = live("u1", "u2", "u3");
		state = meetingReducer(state, { type: "give", memberId: "u2", kpi: IDEA });
		state = meetingReducer(state, { type: "give", memberId: "u2", kpi: IDEA });
		state = meetingReducer(state, { type: "give", memberId: "u3", kpi: IDEA });

		const summary = meetingSummary(state.given, MEMBER_BY_ID);

		expect(summary.attributions).toBe(6);
		expect(summary.totalPoints).toBe(PRESENCE.points * 3 + IDEA.points * 3);
		expect(summary.podium.map((entry) => entry.member.id)).toStrictEqual([
			"u2",
			"u3",
			"u1",
		]);
		expect(summary.podium[0]?.points).toBe(PRESENCE.points + IDEA.points * 2);
	});

	it("devolve podio vazio sem atribuicoes", () => {
		const summary = meetingSummary([], MEMBER_BY_ID);

		expect(summary).toStrictEqual({
			attributions: 0,
			totalPoints: 0,
			podium: [],
		});
	});

	it("ignora membro que nao existe mais", () => {
		const summary = meetingSummary(
			[{ id: "g1", memberId: "fantasma", kpiId: "k1", points: 5 }],
			MEMBER_BY_ID,
		);

		expect(summary.podium).toStrictEqual([]);
		expect(summary.totalPoints).toBe(5);
	});
});

describe("pointsByMember", () => {
	it("agrupa por pessoa", () => {
		const totals = pointsByMember([
			{ id: "g1", memberId: "u1", kpiId: "k1", points: 5 },
			{ id: "g2", memberId: "u1", kpiId: "k3", points: 15 },
			{ id: "g3", memberId: "u2", kpiId: "k1", points: 5 },
		]);

		expect(totals.get("u1")).toBe(20);
		expect(totals.get("u2")).toBe(5);
	});
});
