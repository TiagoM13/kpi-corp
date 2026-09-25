// Elenco das telas que ainda consomem mock (ranking, membros, dashboards).
// Nao participa do login: a sessao vem de `auth.login`.

export type Role = "ADMIN" | "MEMBER";

export type MockUser = {
	id: string;
	name: string;
	email: string;
	position: string;
	role: Role;
	/** matiz do gradiente do avatar, em graus */
	hue: number;
};

export const MOCK_USERS: MockUser[] = [
	{
		id: "u1",
		name: "Ana Beatriz Souza",
		email: "ana.souza@kpicorp.io",
		position: "Tech Lead",
		role: "ADMIN",
		hue: 14,
	},
	{
		id: "u5",
		name: "Eduarda Lima",
		email: "duda.lima@kpicorp.io",
		position: "PM",
		role: "ADMIN",
		hue: 270,
	},
	{
		id: "u2",
		name: "Bruno Carvalho",
		email: "bruno.c@kpicorp.io",
		position: "Backend Sr.",
		role: "MEMBER",
		hue: 200,
	},
	{
		id: "u3",
		name: "Carla Menezes",
		email: "carla.m@kpicorp.io",
		position: "Designer Sr.",
		role: "MEMBER",
		hue: 320,
	},
	{
		id: "u4",
		name: "Diego Almeida",
		email: "diego.a@kpicorp.io",
		position: "Front-end Pleno",
		role: "MEMBER",
		hue: 50,
	},
	{
		id: "u6",
		name: "Felipe Rocha",
		email: "felipe.r@kpicorp.io",
		position: "Backend Pleno",
		role: "MEMBER",
		hue: 130,
	},
	{
		id: "u7",
		name: "Gabriela Tavares",
		email: "gabi.t@kpicorp.io",
		position: "QA Sr.",
		role: "MEMBER",
		hue: 350,
	},
	{
		id: "u8",
		name: "Henrique Vieira",
		email: "henrique.v@kpicorp.io",
		position: "Designer Pleno",
		role: "MEMBER",
		hue: 22,
	},
	{
		id: "u9",
		name: "Isabela Moraes",
		email: "isa.m@kpicorp.io",
		position: "Front-end Jr.",
		role: "MEMBER",
		hue: 180,
	},
	{
		id: "u10",
		name: "João Pedro Nunes",
		email: "jp.nunes@kpicorp.io",
		position: "Backend Jr.",
		role: "MEMBER",
		hue: 290,
	},
	{
		id: "u11",
		name: "Karen Oliveira",
		email: "karen.o@kpicorp.io",
		position: "QA Pleno",
		role: "MEMBER",
		hue: 90,
	},
	{
		id: "u12",
		name: "Lucas Pereira",
		email: "lucas.p@kpicorp.io",
		position: "Estagiário",
		role: "MEMBER",
		hue: 240,
	},
];
