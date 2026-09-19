import { hash } from "bcryptjs";
import { config } from "dotenv";

config({ path: "../../apps/server/.env" });

/** Must match DEFAULT_COST in packages/api/src/shared/security/password.ts. */
const PASSWORD_COST = 12;

async function main() {
	const { default: prisma } = await import("./index");

	// Hashed here rather than through @kpi-corp/api: packages/api already depends
	// on packages/db, and importing it back would close a workspace cycle.
	const hashPassword = (password: string) => hash(password, PASSWORD_COST);

	const members = [
		{ name: "Ana Souza", email: "ana@kpicorp.com" },
		{ name: "Bruno Lima", email: "bruno@kpicorp.com" },
		{ name: "Carla Dias", email: "carla@kpicorp.com" },
	];

	const adminPasswordHash = await hashPassword("admin123");

	const admin = await prisma.user.upsert({
		where: { email: "admin@kpicorp.com" },
		update: {},
		create: {
			name: "Administrador",
			email: "admin@kpicorp.com",
			passwordHash: adminPasswordHash,
			role: "ADMIN",
		},
	});

	console.log(`Admin seeded: ${admin.email} (${admin.id})`);

	for (const member of members) {
		const passwordHash = await hashPassword("member123");

		const user = await prisma.user.upsert({
			where: { email: member.email },
			update: {},
			create: {
				name: member.name,
				email: member.email,
				passwordHash,
				role: "MEMBER",
			},
		});

		console.log(`Member seeded: ${user.email} (${user.id})`);
	}

	const kpis = [
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
		{
			name: "Boa ideia em reunião",
			points: 15,
			category: "INITIATIVE" as const,
		},
		{ name: "Documentou processo", points: 8, category: "INITIATIVE" as const },
	];

	for (const item of kpis) {
		const kpi = await prisma.kpi.upsert({
			where: { name: item.name },
			update: {},
			create: item,
		});

		console.log(`KPI seeded: ${kpi.name} (${kpi.points} pts, ${kpi.category})`);
	}

	const assignmentCount = await prisma.kpiAssignment.count();

	if (assignmentCount === 0) {
		const users = await prisma.user.findMany({
			where: { email: { in: members.map((member) => member.email) } },
		});
		const kpiByName = new Map(
			(
				await prisma.kpi.findMany({
					where: { name: { in: kpis.map((item) => item.name) } },
				})
			).map((kpi) => [kpi.name, kpi]),
		);

		const pick = (email: string, kpiName: string, note: string | null) => {
			const user = users.find((item) => item.email === email);
			const kpi = kpiByName.get(kpiName);

			if (!user || !kpi) {
				throw new Error(`Seed inconsistente: ${email} / ${kpiName}`);
			}

			return { user, kpi, note };
		};

		const assignments = [
			pick(
				"ana@kpicorp.com",
				"Presença na reunião",
				"Presença na reunião semanal",
			),
			pick(
				"ana@kpicorp.com",
				"Entregou no prazo",
				"Sprint 34 entregue sem atraso",
			),
			pick(
				"bruno@kpicorp.com",
				"Presença na reunião",
				"Presença na reunião semanal",
			),
			pick(
				"bruno@kpicorp.com",
				"Ajudou um colega",
				"Pair programming com a Carla",
			),
			pick(
				"carla@kpicorp.com",
				"Boa ideia em reunião",
				"Sugestão de métrica de churn",
			),
		];

		for (const { user, kpi, note } of assignments) {
			await prisma.kpiAssignment.create({
				data: {
					kpiId: kpi.id,
					userId: user.id,
					assignedBy: admin.id,
					note,
					points: kpi.points,
				},
			});

			console.log(
				`Assignment seeded: ${kpi.name} (${kpi.points} pts) -> ${user.name}`,
			);
		}

		const revokedPick = pick(
			"ana@kpicorp.com",
			"Feedback construtivo",
			"Atribuição revogada de exemplo",
		);

		const revoked = await prisma.kpiAssignment.create({
			data: {
				kpiId: revokedPick.kpi.id,
				userId: revokedPick.user.id,
				assignedBy: admin.id,
				note: revokedPick.note,
				points: revokedPick.kpi.points,
				revokedAt: new Date(),
			},
		});

		console.log(`Assignment revogado seeded: ${revoked.id}`);
	} else {
		console.log(`Assignments already seeded (${assignmentCount}), pulando.`);
	}

	const meetingCount = await prisma.meeting.count();

	if (meetingCount === 0) {
		const users = await prisma.user.findMany({
			where: { email: { in: members.map((member) => member.email) } },
		});
		const userByEmail = new Map(users.map((user) => [user.email, user]));
		const kpiByName = new Map(
			(
				await prisma.kpi.findMany({
					where: { name: { in: kpis.map((item) => item.name) } },
				})
			).map((kpi) => [kpi.name, kpi]),
		);

		const ana = userByEmail.get("ana@kpicorp.com");
		const bruno = userByEmail.get("bruno@kpicorp.com");
		const carla = userByEmail.get("carla@kpicorp.com");
		const presenceKpi = kpiByName.get("Presença na reunião");
		const initiativeKpi = kpiByName.get("Boa ideia em reunião");

		if (!ana || !bruno || !carla || !presenceKpi || !initiativeKpi) {
			throw new Error("Seed inconsistente: reuniões");
		}

		// Reunião aberta: escalados Ana e Bruno, pronta para presença ao vivo.
		const openMeeting = await prisma.meeting.create({
			data: {
				title: "Reunião semanal",
				date: new Date("2026-09-20"),
				createdBy: admin.id,
				attendees: {
					create: [{ userId: ana.id }, { userId: bruno.id }],
				},
			},
		});

		console.log(`Meeting aberta seeded: ${openMeeting.id}`);

		// Reunião encerrada com presença: Ana escalada e ausente, Bruno
		// escalado e presente, Carla presente sem escala. Um KPI ao vivo.
		const closedMeeting = await prisma.meeting.create({
			data: {
				title: "Reunião de planejamento",
				date: new Date("2026-09-14"),
				closedAt: new Date("2026-09-14T15:00:00.000Z"),
				createdBy: admin.id,
				attendees: {
					create: [
						{ userId: ana.id },
						{
							userId: bruno.id,
							presentAt: new Date("2026-09-14T14:05:00.000Z"),
						},
						{
							userId: carla.id,
							presentAt: new Date("2026-09-14T14:02:00.000Z"),
						},
					],
				},
			},
		});

		await prisma.kpiAssignment.createMany({
			data: [
				{
					kpiId: presenceKpi.id,
					userId: bruno.id,
					assignedBy: admin.id,
					meetingId: closedMeeting.id,
					note: null,
					points: presenceKpi.points,
				},
				{
					kpiId: presenceKpi.id,
					userId: carla.id,
					assignedBy: admin.id,
					meetingId: closedMeeting.id,
					note: null,
					points: presenceKpi.points,
				},
				{
					kpiId: initiativeKpi.id,
					userId: carla.id,
					assignedBy: admin.id,
					meetingId: closedMeeting.id,
					note: "Sugestão de pauta para a sprint",
					points: initiativeKpi.points,
				},
			],
		});

		console.log(`Meeting encerrada seeded: ${closedMeeting.id}`);
	} else {
		console.log(`Meetings already seeded (${meetingCount}), pulando.`);
	}

	await prisma.$disconnect();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
