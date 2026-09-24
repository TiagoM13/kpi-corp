import {
	previousWindow,
	type RankingWindow,
	rank,
	windowOf,
} from "../../shared/ranking";
import { PeriodNotAllowedError } from "./ranking.errors";
import { type AggregatedMember, toRankableRow } from "./ranking.mapper";
import { type RankingPeriodKey, rankingRepository } from "./ranking.repository";

export type RankingPeriodParam = "week" | "month" | "quarter" | "all";

export type AuthenticatedUser = {
	userId: string;
	role: "ADMIN" | "MEMBER";
};

// Teto da materialização para trás: uma primeira leitura em banco antigo não
// pode virar uma requisição de trinta segundos. Janelas além do teto ficam
// sem snapshot — `change` só olha a anterior, então o prejuízo é nenhum.
const MATERIALIZATION_LIMIT = 12;

type RankingResponse = {
	period: RankingPeriodParam;
	periodStart: string | null;
	periodEnd: string | null;
	items: {
		position: number;
		member: {
			id: string;
			name: string;
			position: string | null;
			role: "ADMIN" | "MEMBER";
		};
		points: number;
		kpiCount: number;
		change: number | null;
		isMe: boolean;
	}[];
	me: {
		position: number;
		points: number;
		kpiCount: number;
		change: number | null;
	} | null;
};

function buildResponse(params: {
	period: RankingPeriodParam;
	window: RankingWindow | null;
	rows: AggregatedMember[];
	snapshotPositions: Map<string, number>;
	authenticatedUserId: string;
}): RankingResponse {
	const ranked = rank(params.rows.map(toRankableRow));
	const memberById = new Map(params.rows.map((row) => [row.id, row]));

	const items = ranked.map((row) => {
		const member = memberById.get(row.userId);

		if (!member) {
			throw new Error(`Ranking row ${row.userId} has no member`);
		}

		const snapshotPosition = params.snapshotPositions.get(row.userId);

		return {
			position: row.position,
			member: {
				id: member.id,
				name: member.name,
				position: member.position,
				role: member.role,
			},
			points: row.points,
			kpiCount: row.kpiCount,
			// change positivo é subida. Ausente do snapshot anterior — ou
			// snapshot inexistente — é null, nunca 0: "não sei" ≠ "não mudou".
			change:
				snapshotPosition === undefined ? null : snapshotPosition - row.position,
			isMe: row.userId === params.authenticatedUserId,
		};
	});

	const meEntry = items.find((item) => item.isMe) ?? null;

	return {
		period: params.period,
		periodStart: params.window?.startDay ?? null,
		periodEnd: params.window?.endDay ?? null,
		items,
		me: meEntry
			? {
					position: meEntry.position,
					points: meEntry.points,
					kpiCount: meEntry.kpiCount,
					change: meEntry.change,
				}
			: null,
	};
}

async function materializeWindow(
	period: RankingPeriodKey,
	window: RankingWindow,
) {
	// Janela sem nenhuma atribuição não vira snapshot: ordenar a equipe
	// inteira por nome congelaria o alfabeto, não desempenho.
	const assignmentCount =
		await rankingRepository.countAssignmentsInWindow(window);

	if (assignmentCount === 0) {
		return;
	}

	const rows = await rankingRepository.aggregateWindow(window);

	await rankingRepository.createSnapshots(
		period,
		window.startDay,
		rank(rows.map(toRankableRow)),
	);
}

// Anda para trás a partir da janela anterior congelando o que falta, até
// encontrar um snapshot existente ou bater no teto. Garante que uma janela
// que ninguém leu não some para sempre — a leitura seguinte ainda terá o
// `change` dela.
async function materializeBack(
	period: RankingPeriodKey,
	firstWindow: RankingWindow,
) {
	const candidates: RankingWindow[] = [];
	let cursor = firstWindow;

	for (let index = 0; index < MATERIALIZATION_LIMIT; index += 1) {
		candidates.push(cursor);
		cursor = previousWindow(period, cursor);
	}

	const existing = new Set(
		(
			await rankingRepository.findSnapshotStarts(
				period,
				candidates.map((window) => window.startDay),
			)
		).map((snapshot) => snapshot.periodStart.toISOString().slice(0, 10)),
	);

	for (const window of candidates) {
		if (existing.has(window.startDay)) {
			break;
		}

		await materializeWindow(period, window);
	}
}

export const rankingService = {
	async getRanking(
		period: RankingPeriodParam,
		auth: AuthenticatedUser,
		now = new Date(),
	): Promise<RankingResponse> {
		// Guard de perfil fica na procedure; guard de VALOR é regra de
		// negócio — a rota é dos dois papéis, o trimestre é do Admin.
		if (period === "quarter" && auth.role !== "ADMIN") {
			throw new PeriodNotAllowedError();
		}

		if (period === "all") {
			const rows = await rankingRepository.aggregateAll();

			// Sem janela não há "o all anterior": change null, sem snapshot.
			return buildResponse({
				period,
				window: null,
				rows,
				snapshotPositions: new Map(),
				authenticatedUserId: auth.userId,
			});
		}

		const window = windowOf(period, now);
		const previous = previousWindow(period, window);

		// Só janela fechada congela — a corrente ainda muda, e congelá-la
		// produziria snapshot mentiroso e change sempre zero.
		await materializeBack(period, previous);

		const [rows, snapshots] = await Promise.all([
			rankingRepository.aggregateWindow(window),
			rankingRepository.findSnapshot(period, previous.startDay),
		]);

		return buildResponse({
			period,
			window,
			rows,
			snapshotPositions: new Map(
				snapshots.map((snapshot) => [snapshot.userId, snapshot.position]),
			),
			authenticatedUserId: auth.userId,
		});
	},
};

export type RankingService = typeof rankingService;
