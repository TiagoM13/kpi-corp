import { randomUUID } from "node:crypto";

import { hash } from "bcryptjs";
import { config } from "dotenv";

config({ path: "../../apps/server/.env" });

/** Must match DEFAULT_COST in packages/api/src/shared/security/password.ts. */
const PASSWORD_COST = 12;

/** Must match LEVEL_THRESHOLDS[MAX_LEVEL] in packages/api/src/shared/gamification/levels.ts. */
const MAX_LEVEL_POINTS = 7500;

const PASSWORD = "admin123";
const SP_OFFSET = "-03:00";
const SP_TIMEZONE = "America/Sao_Paulo";
const HISTORY_WEEKS = 24;
const DEFAULT_WEIGHT = 0.5;
const NOTE_CHANCE = 0.35;
const ASSIGNER_EMAIL = "admin@kpicorp.com";
const TOP_MEMBER_EMAIL = "marina.duarte@kapicorp.com";
const PRESENCE_KPI_NAME = "Presença na reunião";
const REVOKED_SAMPLE_EMAILS = [
	"lucas.ferreira@kapicorp.com",
	"gabriel.santos@kapicorp.com",
	"mariana.costa@kapicorp.com",
];

type Role = "ADMIN" | "MEMBER";
type Group = "BOSS" | "PO" | "TECH_LEAD" | "DEV" | "DESIGN" | "QA";

type SeedMember = {
	name: string;
	email: string;
	role: Role;
	position: string;
	group: Group;
	points: number;
	attendance: number;
};

type PoolKpi = {
	id: string;
	name: string;
	points: number;
	category: string;
};

type AssignmentRow = {
	kpiId: string;
	userId: string;
	assignedBy: string;
	meetingId: string | null;
	note: string | null;
	points: number;
	assignedAt: Date;
	revokedAt: Date | null;
};

const BASE_KPIS = [
	{ name: "Presença na reunião", points: 5, category: "PRESENCE" as const },
	{ name: "Chegou no horário", points: 3, category: "PRESENCE" as const },
	{ name: "Entregou no prazo", points: 12, category: "PERFORMANCE" as const },
	{
		name: "Resolveu bug crítico",
		points: 25,
		category: "PERFORMANCE" as const,
	},
	{ name: "Ajudou um colega", points: 10, category: "BEHAVIOR" as const },
	{ name: "Feedback construtivo", points: 7, category: "BEHAVIOR" as const },
	{ name: "Boa ideia em reunião", points: 15, category: "INITIATIVE" as const },
	{ name: "Documentou processo", points: 8, category: "INITIATIVE" as const },
];

const MEMBERS: SeedMember[] = [
	{
		name: "Eduardo Santos",
		email: ASSIGNER_EMAIL,
		role: "ADMIN",
		position: "Chefe",
		group: "BOSS",
		points: 1400,
		attendance: 0.85,
	},
	{
		name: "Marina Duarte",
		email: TOP_MEMBER_EMAIL,
		role: "MEMBER",
		position: "Product Owner Sênior",
		group: "PO",
		points: 7850,
		attendance: 1,
	},
	{
		name: "Pedro Henrique Alves",
		email: "pedro.alves@kapicorp.com",
		role: "MEMBER",
		position: "Desenvolvedor Full-stack Sênior",
		group: "DEV",
		points: 6350,
		attendance: 0.96,
	},
	{
		name: "André Martins",
		email: "andre.martins@kapicorp.com",
		role: "MEMBER",
		position: "Tech Lead",
		group: "TECH_LEAD",
		points: 5450,
		attendance: 0.94,
	},
	{
		name: "João Pedro Lima",
		email: "joao.lima@kapicorp.com",
		role: "MEMBER",
		position: "Desenvolvedor Back-end Sênior",
		group: "DEV",
		points: 4700,
		attendance: 0.92,
	},
	{
		name: "Juliana Mendes",
		email: "juliana.mendes@kapicorp.com",
		role: "MEMBER",
		position: "Product Designer Sênior",
		group: "DESIGN",
		points: 3900,
		attendance: 0.95,
	},
	{
		name: "Matheus Rocha",
		email: "matheus.rocha@kapicorp.com",
		role: "MEMBER",
		position: "Desenvolvedor Full-stack Pleno",
		group: "DEV",
		points: 3300,
		attendance: 0.9,
	},
	{
		name: "Lucas Ferreira",
		email: "lucas.ferreira@kapicorp.com",
		role: "MEMBER",
		position: "Desenvolvedor Front-end Pleno",
		group: "DEV",
		points: 2350,
		attendance: 0.88,
	},
	{
		name: "Gabriel Santos",
		email: "gabriel.santos@kapicorp.com",
		role: "MEMBER",
		position: "Desenvolvedor Back-end Pleno",
		group: "DEV",
		points: 1950,
		attendance: 0.87,
	},
	{
		name: "Fernanda Lopes",
		email: "fernanda.lopes@kapicorp.com",
		role: "MEMBER",
		position: "Analista de QA Pleno",
		group: "QA",
		points: 1600,
		attendance: 0.93,
	},
	{
		name: "Mariana Costa",
		email: "mariana.costa@kapicorp.com",
		role: "MEMBER",
		position: "Product Designer Pleno",
		group: "DESIGN",
		points: 1150,
		attendance: 0.8,
	},
	{
		name: "Vinícius Barros",
		email: "vinicius.barros@kapicorp.com",
		role: "MEMBER",
		position: "Desenvolvedor Mobile Pleno",
		group: "DEV",
		points: 750,
		attendance: 0.75,
	},
];

const COMMERCIAL_KPIS = new Set([
	"Conquistou Novo Cliente",
	"Agendou Reunião Estratégica",
	"Excelente Abordagem Comercial",
]);

const AFFINITY: Record<Group, Record<string, number>> = {
	BOSS: {
		"Conquistou Novo Cliente": 4,
		"Agendou Reunião Estratégica": 4,
		"Excelente Abordagem Comercial": 3,
		Liderança: 3,
		"Feedback construtivo": 3,
		"Destaque da Semana": 2,
		"Boa ideia em reunião": 2,
		"Priorização Estratégica": 2,
		"Identificou Oportunidade": 2,
		"Chegou no horário": 1,
		"Resolveu bug crítico": 0,
		"Encontrou Bug Crítico": 0,
		"Revisão Técnica de Excelência": 0,
		"Apresentou Design com Excelência": 0,
	},
	PO: {
		"Visão de Produto": 5,
		"Priorização Estratégica": 5,
		"Conduziu Discovery": 4,
		"Identificou Oportunidade": 3,
		"Antecipou uma Necessidade": 3,
		Liderança: 3,
		"Boa ideia em reunião": 3,
		"Desbloqueou o Time": 3,
		"Destaque da Semana": 2,
		"Feedback construtivo": 2,
		"Entregou no prazo": 2,
		"Documentou processo": 2,
		"Excelente Abordagem Comercial": 1,
		"Resolveu bug crítico": 0,
		"Encontrou Bug Crítico": 0,
		"Revisão Técnica de Excelência": 0,
		"Apresentou Design com Excelência": 0,
	},
	TECH_LEAD: {
		"Conduziu Alinhamento Técnico": 4,
		"Revisão Técnica de Excelência": 4,
		"Entregou no prazo": 3,
		"Resolução de Problema": 3,
		Liderança: 3,
		"Desbloqueou o Time": 3,
		"Resolveu bug crítico": 3,
		"Ajudou um colega": 3,
		"Garantiu Qualidade da Entrega": 2,
		"Documentou processo": 2,
		"Propôs uma Melhoria": 2,
		"Registrou Feitos na Task do Jira": 2,
		"Apresentou Design com Excelência": 0,
		"Conduziu Discovery": 0,
		"Visão de Produto": 0,
		"Encontrou Bug Crítico": 0,
	},
	DEV: {
		"Entregou no prazo": 4,
		"Resolveu bug crítico": 3,
		"Revisão Técnica de Excelência": 3,
		"Resolução de Problema": 3,
		"Registrou Feitos na Task do Jira": 3,
		"Ajudou um colega": 3,
		"Entrega antecipada": 2,
		"Garantiu Qualidade da Entrega": 2,
		"Documentou processo": 2,
		"Propôs uma Melhoria": 2,
		"Apresentou Design com Excelência": 0,
		"Conduziu Discovery": 0,
		"Visão de Produto": 0,
		"Priorização Estratégica": 0,
		"Encontrou Bug Crítico": 0,
		Liderança: 0,
		"Conduziu Alinhamento Técnico": 0,
	},
	DESIGN: {
		"Apresentou Design com Excelência": 5,
		"Conduziu Discovery": 3,
		"Entregou no prazo": 3,
		"Feedback construtivo": 3,
		"Boa ideia em reunião": 3,
		Proatividade: 2,
		"Ajudou um colega": 2,
		"Documentou processo": 2,
		"Resolveu bug crítico": 0,
		"Encontrou Bug Crítico": 0,
		"Revisão Técnica de Excelência": 0,
		"Conduziu Alinhamento Técnico": 0,
		Liderança: 0,
	},
	QA: {
		"Encontrou Bug Crítico": 5,
		"Garantiu Qualidade da Entrega": 5,
		"Documentou processo": 3,
		"Feedback construtivo": 3,
		"Registrou Feitos na Task do Jira": 2,
		"Entregou no prazo": 2,
		"Resolução de Problema": 2,
		Proatividade: 2,
		"Resolveu bug crítico": 0,
		"Revisão Técnica de Excelência": 0,
		"Apresentou Design com Excelência": 0,
		"Conduziu Discovery": 0,
		"Conduziu Alinhamento Técnico": 0,
		Liderança: 0,
	},
};

const NOTES: Record<string, string[]> = {
	PRESENCE: ["Pontualidade na daily"],
	PERFORMANCE: [
		"Sprint entregue sem atraso",
		"Entrega concluída no prazo",
		"Resultado acima do esperado no ciclo",
	],
	BEHAVIOR: [
		"Apoio no onboarding",
		"Pair programming com o time",
		"Mediou o alinhamento entre as squads",
	],
	INITIATIVE: [
		"Sugestão aprovada no planejamento",
		"Documentação do processo atualizada",
		"Proposta adotada pelo time",
	],
};

function createRng(seed: number) {
	let state = seed;

	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let value = Math.imul(state ^ (state >>> 15), 1 | state);
		value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;

		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

function spDay(at: Date): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: SP_TIMEZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(at);
}

function addDays(day: string, count: number): string {
	const date = new Date(`${day}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + count);

	return date.toISOString().slice(0, 10);
}

function weekdayIndex(day: string): number {
	return (new Date(`${day}T00:00:00.000Z`).getUTCDay() + 6) % 7;
}

function mondayOf(day: string): string {
	return addDays(day, -weekdayIndex(day));
}

function spDate(day: string, hour: number, minute: number): Date {
	const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

	return new Date(`${day}T${time}:00${SP_OFFSET}`);
}

function weightOf(group: Group, kpi: PoolKpi): number {
	const explicit = AFFINITY[group][kpi.name];

	if (explicit !== undefined) {
		return explicit;
	}

	return COMMERCIAL_KPIS.has(kpi.name) ? 0 : DEFAULT_WEIGHT;
}

function pickWeighted<T>(
	items: T[],
	weight: (item: T) => number,
	rng: () => number,
): T {
	let cursor = rng() * items.reduce((sum, item) => sum + weight(item), 0);

	for (const item of items) {
		cursor -= weight(item);

		if (cursor < 0) {
			return item;
		}
	}

	const last = items[items.length - 1];

	if (!last) {
		throw new Error("Nenhum KPI candidato para sortear.");
	}

	return last;
}

function reachableTotals(target: number, coins: number[]): boolean[] {
	const reachable = new Array<boolean>(target + 1).fill(false);
	reachable[0] = true;

	for (let value = 1; value <= target; value++) {
		reachable[value] = coins.some(
			(coin) => coin <= value && reachable[value - coin] === true,
		);
	}

	return reachable;
}

function pickNote(category: string, rng: () => number): string | null {
	const bank = NOTES[category] ?? [];

	if (bank.length === 0 || rng() >= NOTE_CHANCE) {
		return null;
	}

	return bank[Math.floor(rng() * bank.length)] ?? null;
}

type FillerInput = {
	member: SeedMember;
	userId: string;
	assignerId: string;
	target: number;
	pool: PoolKpi[];
	weekStarts: string[];
	today: string;
	now: Date;
	rng: () => number;
};

function buildFillerRows(input: FillerInput): AssignmentRow[] {
	const { member, userId, assignerId, target, pool, weekStarts } = input;
	const { today, now, rng } = input;
	const rows: AssignmentRow[] = [];

	if (target === 0) {
		return rows;
	}

	const reachable = reachableTotals(target, [
		...new Set(pool.map((kpi) => kpi.points)),
	]);

	if (reachable[target] !== true) {
		throw new Error(
			`Total não representável com o catálogo para ${member.name}: ${target}`,
		);
	}

	const shares = weekStarts.map(() => 0.92 + rng() * 0.16);
	const shareTotal = shares.reduce((sum, share) => sum + share, 0);
	const currentMonday = mondayOf(today);
	let accumulated = 0;
	let assigned = 0;

	for (const [weekIndex, monday] of weekStarts.entries()) {
		accumulated += shares[weekIndex] ?? 0;

		const isLastWeek = weekIndex === weekStarts.length - 1;
		const goal = isLastWeek
			? target
			: Math.round((target * accumulated) / shareTotal);
		const lastDay =
			monday === currentMonday ? Math.min(4, weekdayIndex(today)) : 4;

		while (assigned < goal) {
			const remaining = target - assigned;
			const candidates = pool.filter(
				(kpi) =>
					kpi.points <= goal - assigned &&
					reachable[remaining - kpi.points] === true,
			);

			if (candidates.length === 0) {
				break;
			}

			const kpi = pickWeighted(
				candidates,
				(candidate) => weightOf(member.group, candidate),
				rng,
			);
			const day = addDays(monday, Math.floor(rng() * (lastDay + 1)));
			let assignedAt = spDate(
				day,
				9 + Math.floor(rng() * 9),
				Math.floor(rng() * 60),
			);

			if (assignedAt >= now) {
				assignedAt = new Date(now.getTime() - Math.floor(rng() * 120) * 60_000);
			}

			rows.push({
				kpiId: kpi.id,
				userId,
				assignedBy: assignerId,
				meetingId: null,
				note: pickNote(kpi.category, rng),
				points: kpi.points,
				assignedAt,
				revokedAt: null,
			});
			assigned += kpi.points;
		}
	}

	return rows;
}

function leadersBy(
	rows: AssignmentRow[],
	keyOf: (row: AssignmentRow) => string,
): Map<string, string> {
	const totals = new Map<string, Map<string, number>>();

	for (const row of rows) {
		const key = keyOf(row);
		const byUser = totals.get(key) ?? new Map<string, number>();
		byUser.set(row.userId, (byUser.get(row.userId) ?? 0) + row.points);
		totals.set(key, byUser);
	}

	const leaders = new Map<string, string>();

	for (const [key, byUser] of totals) {
		const [top] = [...byUser.entries()].sort((a, b) => b[1] - a[1]);

		if (top) {
			leaders.set(key, top[0]);
		}
	}

	return leaders;
}

async function main() {
	const { default: prisma } = await import("./index");

	if ((await prisma.kpi.count()) === 0) {
		await prisma.kpi.createMany({ data: BASE_KPIS });
		console.log(`KPIs criados (catálogo vazio): ${BASE_KPIS.length}`);
	}

	const kpis: PoolKpi[] = await prisma.kpi.findMany({
		where: { active: true, points: { gt: 0 } },
		select: { id: true, name: true, points: true, category: true },
		orderBy: { name: "asc" },
	});
	const presenceKpi =
		kpis.find((kpi) => kpi.name === PRESENCE_KPI_NAME) ??
		kpis.find((kpi) => kpi.category === "PRESENCE");
	const pool = kpis.filter((kpi) => kpi.id !== presenceKpi?.id);

	if (MEMBERS.filter((member) => member.role === "ADMIN").length !== 1) {
		throw new Error("O seed precisa ter exatamente um ADMIN.");
	}

	const now = new Date();
	const rng = createRng(20260926);
	const today = spDay(now);
	const currentMonday = mondayOf(today);
	const weekStarts = Array.from({ length: HISTORY_WEEKS }, (_, index) =>
		addDays(currentMonday, (index - HISTORY_WEEKS + 1) * 7),
	);
	const firstWeek = weekStarts[0];

	if (!firstWeek) {
		throw new Error("Histórico sem semanas.");
	}

	const passwordHash = await hash(PASSWORD, PASSWORD_COST);
	const createdAt = new Date(`${addDays(firstWeek, -1)}T12:00:00.000Z`);
	const users = MEMBERS.map((member) => ({
		id: randomUUID(),
		name: member.name,
		email: member.email,
		passwordHash,
		role: member.role,
		position: member.position,
		createdAt,
	}));
	const userIdByEmail = new Map(users.map((user) => [user.email, user.id]));
	const idOf = (email: string) => {
		const id = userIdByEmail.get(email);

		if (!id) {
			throw new Error(`Membro fora do seed: ${email}`);
		}

		return id;
	};
	const assignerId = idOf(ASSIGNER_EMAIL);

	const meetingPlans: { title: string; day: string }[] = [];

	for (const [index, monday] of weekStarts.entries()) {
		meetingPlans.push({ title: "Reunião semanal", day: monday });

		const planningDay = addDays(monday, 3);

		if (index % 2 === 1 && planningDay <= today) {
			meetingPlans.push({ title: "Reunião de planejamento", day: planningDay });
		}
	}

	const meetings: {
		id: string;
		title: string;
		date: Date;
		closedAt: Date | null;
		createdBy: string;
	}[] = [];
	const attendees: {
		meetingId: string;
		userId: string;
		presentAt: Date | null;
	}[] = [];
	const assignments: AssignmentRow[] = [];
	const presencePoints = new Map<string, number>();

	for (const plan of meetingPlans) {
		const closedAt = spDate(plan.day, 15, 0);

		if (closedAt >= now) {
			continue;
		}

		const meetingId = randomUUID();

		meetings.push({
			id: meetingId,
			title: plan.title,
			date: new Date(`${plan.day}T00:00:00.000Z`),
			closedAt,
			createdBy: assignerId,
		});

		for (const member of MEMBERS) {
			const userId = idOf(member.email);
			const isPresent = rng() < member.attendance;
			const presentAt = isPresent
				? spDate(plan.day, 14, Math.floor(rng() * 15))
				: null;

			attendees.push({ meetingId, userId, presentAt });

			if (presentAt && presenceKpi) {
				assignments.push({
					kpiId: presenceKpi.id,
					userId,
					assignedBy: assignerId,
					meetingId,
					note: null,
					points: presenceKpi.points,
					assignedAt: presentAt,
					revokedAt: null,
				});
				presencePoints.set(
					userId,
					(presencePoints.get(userId) ?? 0) + presenceKpi.points,
				);
			}
		}
	}

	const openMeetingId = randomUUID();

	meetings.push({
		id: openMeetingId,
		title: "Daily da squad",
		date: new Date(`${today}T00:00:00.000Z`),
		closedAt: null,
		createdBy: assignerId,
	});

	for (const member of MEMBERS) {
		attendees.push({
			meetingId: openMeetingId,
			userId: idOf(member.email),
			presentAt: null,
		});
	}

	for (const member of MEMBERS) {
		const userId = idOf(member.email);
		const memberPool = pool.filter((kpi) => weightOf(member.group, kpi) > 0);
		const target = member.points - (presencePoints.get(userId) ?? 0);

		if (target < 0) {
			throw new Error(`Presença já passa dos pontos de ${member.name}.`);
		}

		assignments.push(
			...buildFillerRows({
				member,
				userId,
				assignerId,
				target,
				pool: memberPool,
				weekStarts,
				today,
				now,
				rng,
			}),
		);
	}

	for (const email of REVOKED_SAMPLE_EMAILS) {
		const member = MEMBERS.find((item) => item.email === email);
		const previousWeek = weekStarts[weekStarts.length - 2];

		if (!member || !previousWeek) {
			continue;
		}

		const kpi = pool.find((item) => weightOf(member.group, item) > 0);

		if (!kpi) {
			continue;
		}

		const assignedAt = spDate(addDays(previousWeek, 2), 11, 30);

		assignments.push({
			kpiId: kpi.id,
			userId: idOf(email),
			assignedBy: assignerId,
			meetingId: null,
			note: "Atribuição lançada por engano",
			points: kpi.points,
			assignedAt,
			revokedAt: new Date(assignedAt.getTime() + 24 * 60 * 60 * 1000),
		});
	}

	const valid = assignments.filter((row) => row.revokedAt === null);
	const totalByUserId = new Map<string, number>();

	for (const row of valid) {
		totalByUserId.set(
			row.userId,
			(totalByUserId.get(row.userId) ?? 0) + row.points,
		);
	}

	const topId = idOf(TOP_MEMBER_EMAIL);
	const problems: string[] = [];

	for (const member of MEMBERS) {
		const total = totalByUserId.get(idOf(member.email)) ?? 0;

		if (total !== member.points) {
			problems.push(`${member.name}: ${total} != ${member.points}`);
		}
	}

	if ((totalByUserId.get(topId) ?? 0) < MAX_LEVEL_POINTS) {
		problems.push(`${TOP_MEMBER_EMAIL} abaixo do nível máximo`);
	}

	for (const [month, leader] of leadersBy(valid, (row) =>
		row.assignedAt.toISOString().slice(0, 7),
	)) {
		if (leader !== topId) {
			problems.push(`${TOP_MEMBER_EMAIL} não lidera o mês ${month}`);
		}
	}

	const weekLeaders = leadersBy(valid, (row) =>
		mondayOf(spDay(row.assignedAt)),
	);

	if (weekLeaders.get(currentMonday) !== topId) {
		problems.push(`${TOP_MEMBER_EMAIL} não lidera a semana corrente`);
	}

	if (leadersBy(valid, () => "all").get("all") !== topId) {
		problems.push(`${TOP_MEMBER_EMAIL} não lidera o ranking geral`);
	}

	if (problems.length > 0) {
		throw new Error(`Seed inconsistente:\n${problems.join("\n")}`);
	}

	await prisma.$transaction([
		prisma.kpiAssignment.deleteMany(),
		prisma.meetingAttendee.deleteMany(),
		prisma.meeting.deleteMany(),
		prisma.userBadge.deleteMany(),
		prisma.rankingSnapshot.deleteMany(),
		prisma.refreshToken.deleteMany(),
		prisma.invitation.deleteMany(),
		prisma.user.deleteMany(),
		prisma.user.createMany({ data: users }),
		prisma.meeting.createMany({ data: meetings }),
		prisma.meetingAttendee.createMany({ data: attendees }),
		prisma.kpiAssignment.createMany({ data: assignments }),
	]);

	const ranking = [...MEMBERS].sort((a, b) => b.points - a.points);

	for (const [index, member] of ranking.entries()) {
		console.log(
			`${String(index + 1).padStart(2)}. ${member.name} — ${member.position} (${member.role}) ${member.points} pts`,
		);
	}

	console.log(
		`OK: ${users.length} usuários, ${meetings.length} reuniões, ${assignments.length} atribuições. KPIs intocados (${kpis.length} ativos). Senha de todos: ${PASSWORD}`,
	);

	await prisma.$disconnect();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
