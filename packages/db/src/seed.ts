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

	await prisma.$disconnect();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
