import type { Kpi } from "@/mocks/kpis";
import type { Member } from "@/mocks/members";

export type MeetingPhase = "setup" | "live" | "done";

export type Attribution = {
	id: string;
	memberId: string;
	kpiId: string;
	points: number;
};

export type MeetingState = {
	phase: MeetingPhase;
	title: string;
	present: string[];
	given: Attribution[];
	selectedKpiId: string | null;
	elapsed: number;
};

export const DEFAULT_MEETING_TITLE = "Daily da squad";

export const INITIAL_MEETING: MeetingState = {
	phase: "setup",
	title: DEFAULT_MEETING_TITLE,
	present: [],
	given: [],
	selectedKpiId: null,
	elapsed: 0,
};

export type MeetingAction =
	| { type: "setTitle"; title: string }
	| { type: "togglePresent"; memberId: string }
	| { type: "markAll"; memberIds: string[] }
	| { type: "clearPresent" }
	| { type: "start"; presenceKpi?: Kpi }
	| { type: "selectKpi"; kpiId: string | null }
	| { type: "give"; memberId: string; kpi: Kpi }
	| { type: "undo" }
	| { type: "tick" }
	| { type: "end" }
	| { type: "restart" };

let sequence = 0;

function nextId() {
	sequence += 1;
	return `g${sequence}`;
}

export function meetingReducer(
	state: MeetingState,
	action: MeetingAction,
): MeetingState {
	switch (action.type) {
		case "setTitle":
			return { ...state, title: action.title };

		case "togglePresent": {
			const present = state.present.includes(action.memberId)
				? state.present.filter((id) => id !== action.memberId)
				: [...state.present, action.memberId];
			return { ...state, present };
		}

		case "markAll":
			return { ...state, present: [...action.memberIds] };

		case "clearPresent":
			return { ...state, present: [] };

		case "start": {
			if (state.present.length === 0) return state;

			const presence = action.presenceKpi;
			const given = presence
				? state.present.map((memberId) => ({
						id: nextId(),
						memberId,
						kpiId: presence.id,
						points: presence.points,
					}))
				: [];

			return { ...state, phase: "live", given, elapsed: 0 };
		}

		case "selectKpi":
			return { ...state, selectedKpiId: action.kpiId };

		case "give": {
			if (state.phase !== "live") return state;
			if (!state.present.includes(action.memberId)) return state;

			return {
				...state,
				given: [
					...state.given,
					{
						id: nextId(),
						memberId: action.memberId,
						kpiId: action.kpi.id,
						points: action.kpi.points,
					},
				],
			};
		}

		case "undo": {
			if (state.given.length === 0) return state;
			return { ...state, given: state.given.slice(0, -1) };
		}

		case "tick":
			return state.phase === "live"
				? { ...state, elapsed: state.elapsed + 1 }
				: state;

		case "end":
			return { ...state, phase: "done", selectedKpiId: null };

		case "restart":
			return { ...INITIAL_MEETING, title: state.title };

		default:
			return state;
	}
}

export function formatElapsed(seconds: number) {
	const safe = Math.max(0, Math.floor(seconds));
	const minutes = Math.floor(safe / 60);
	return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function pointsByMember(given: Attribution[]) {
	const totals = new Map<string, number>();

	for (const attribution of given) {
		totals.set(
			attribution.memberId,
			(totals.get(attribution.memberId) ?? 0) + attribution.points,
		);
	}

	return totals;
}

export type MeetingPodiumEntry = {
	member: Member;
	points: number;
};

export type MeetingSummary = {
	attributions: number;
	totalPoints: number;
	podium: MeetingPodiumEntry[];
};

export function meetingSummary(
	given: Attribution[],
	memberById: Map<string, Member>,
	podiumSize = 3,
): MeetingSummary {
	const totals = pointsByMember(given);

	let totalPoints = 0;
	for (const points of totals.values()) {
		totalPoints += points;
	}

	const podium = [...totals.entries()]
		.map(([memberId, points]) => ({ member: memberById.get(memberId), points }))
		.filter((entry): entry is MeetingPodiumEntry => entry.member !== undefined)
		.sort(
			(a, b) =>
				b.points - a.points ||
				a.member.name.localeCompare(b.member.name, "pt-BR"),
		)
		.slice(0, podiumSize);

	return { attributions: given.length, totalPoints, podium };
}
