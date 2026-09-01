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

	await prisma.$disconnect();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
