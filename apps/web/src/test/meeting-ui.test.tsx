import { ORPCError } from "@orpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiKpi } from "@/lib/kpis";
import type { MeetingAssignment, MeetingDetail } from "@/lib/meetings";
import { AdminMeetingPage } from "@/pages/admin/meeting";

const { clientMock, db, toastMock } = vi.hoisted(() => ({
	db: {
		meetings: new Map<string, MeetingDetail>(),
		sequence: 0,
	},
	clientMock: {
		members: { list: vi.fn() },
		kpis: { list: vi.fn() },
		meetings: {
			list: vi.fn(),
			create: vi.fn(),
			getById: vi.fn(),
			registerAttendance: vi.fn(),
			assignKpi: vi.fn(),
			end: vi.fn(),
		},
		assignments: { revoke: vi.fn() },
		dashboard: { getAdmin: vi.fn() },
	},
	toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/utils/orpc", async () => {
	const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
	return { client: clientMock, orpc: createTanstackQueryUtils(clientMock) };
});
vi.mock("sonner", () => ({ toast: toastMock }));

const MEMBERS = [
	{ id: "ana", name: "Ana Souza", position: "Dev" },
	{ id: "bruno", name: "Bruno Lima", position: "Design" },
	{ id: "carla", name: "Carla Dias", position: null },
];

function kpi(
	id: string,
	name: string,
	category: ApiKpi["category"],
	points: number,
): ApiKpi {
	return {
		id,
		name,
		description: null,
		points,
		category,
		active: true,
		uses: 0,
		createdAt: new Date(),
	};
}

const PRESENCE = kpi("presenca", "Presença na reunião", "PRESENCE", 5);
const ON_TIME = kpi("pontual", "Chegou no horário", "PRESENCE", 3);
const IDEA = kpi("ideia", "Boa ideia em reunião", "INITIATIVE", 15);

function nextId(prefix: string) {
	db.sequence += 1;
	return `${prefix}-${db.sequence}`;
}

function meetingOr404(id: string) {
	const meeting = db.meetings.get(id);
	if (!meeting) {
		throw new ORPCError("NOT_FOUND", { data: { code: "MEETING_NOT_FOUND" } });
	}
	return meeting;
}

function assignmentFor(
	meeting: MeetingDetail,
	source: ApiKpi,
	userId: string,
): MeetingAssignment {
	return {
		id: nextId("atr"),
		kpiId: source.id,
		userId,
		assignedBy: "admin",
		meetingId: meeting.id,
		note: null,
		points: source.points,
		revokedAt: null,
		assignedAt: new Date(Date.now() + db.sequence),
		kpi: { id: source.id, name: source.name, category: source.category },
	};
}

function withScores(meeting: MeetingDetail) {
	const scores = new Map<string, { points: number; count: number }>();
	for (const item of meeting.assignments) {
		if (item.revokedAt) continue;
		const score = scores.get(item.userId) ?? { points: 0, count: 0 };
		scores.set(item.userId, {
			points: score.points + item.points,
			count: score.count + 1,
		});
	}

	for (const attendee of meeting.attendees) {
		attendee.points = scores.get(attendee.userId)?.points ?? 0;
	}

	meeting.summary = {
		totalPoints: [...scores.values()].reduce((sum, s) => sum + s.points, 0),
		podium: meeting.attendees
			.map((attendee) => ({
				userId: attendee.userId,
				name: attendee.name,
				points: attendee.points,
				count: scores.get(attendee.userId)?.count ?? 0,
			}))
			.filter((entry) => entry.points > 0)
			.sort(
				(a, b) =>
					b.points - a.points ||
					b.count - a.count ||
					a.name.localeCompare(b.name),
			)
			.slice(0, 3)
			.map(({ userId, name, points }) => ({ userId, name, points })),
	};

	return meeting;
}

function save(meeting: MeetingDetail) {
	db.meetings.set(meeting.id, withScores(meeting));
	return structuredClone(meeting);
}

function seedMeeting(overrides: Partial<MeetingDetail> = {}) {
	return save({
		id: "reuniao-1",
		title: "Daily de terça",
		date: new Date("2026-09-25T00:00:00.000Z"),
		status: "OPEN",
		closedAt: null,
		createdAt: new Date(),
		createdBy: { id: "admin", name: "Administrador" },
		attendees: [
			{
				userId: "ana",
				name: "Ana Souza",
				position: "Dev",
				presentAt: new Date(),
				points: 0,
			},
			{
				userId: "bruno",
				name: "Bruno Lima",
				position: "Design",
				presentAt: null,
				points: 0,
			},
		],
		assignments: [],
		summary: { totalPoints: 0, podium: [] },
		...overrides,
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	db.meetings.clear();
	db.sequence = 0;

	clientMock.members.list.mockResolvedValue({
		items: MEMBERS.map((member) => ({
			...member,
			email: `${member.id}@kpicorp.com`,
			role: "MEMBER",
			active: true,
			createdAt: new Date(),
			points: 0,
			kpiCount: 0,
			lastAssignmentAt: null,
			daysWithoutKpi: 0,
			stagnant: false,
			level: {},
		})),
		page: 1,
		limit: 100,
		total: MEMBERS.length,
		totalPages: 1,
	});

	clientMock.kpis.list.mockImplementation(
		async (input: { category?: string }) => {
			const all = [PRESENCE, ON_TIME, IDEA];
			const items = input.category
				? all.filter((item) => item.category === input.category)
				: all;
			return { items, total: items.length };
		},
	);

	clientMock.meetings.list.mockImplementation(async () => {
		const items = [...db.meetings.values()]
			.filter((meeting) => meeting.status === "OPEN")
			.map((meeting) => ({
				id: meeting.id,
				title: meeting.title,
				date: meeting.date,
				status: meeting.status,
				closedAt: meeting.closedAt,
				attendeeCount: meeting.attendees.length,
				presentCount: meeting.attendees.filter((a) => a.presentAt).length,
				assignmentCount: meeting.assignments.length,
			}));
		return { items, page: 1, limit: 20, total: items.length, totalPages: 1 };
	});

	clientMock.meetings.create.mockImplementation(
		async ({ title, date }: { title: string; date: string }) =>
			save({
				id: nextId("reuniao"),
				title,
				date: new Date(`${date}T00:00:00.000Z`),
				status: "OPEN",
				closedAt: null,
				createdAt: new Date(),
				createdBy: { id: "admin", name: "Administrador" },
				attendees: [],
				assignments: [],
				summary: { totalPoints: 0, podium: [] },
			}),
	);

	clientMock.meetings.getById.mockImplementation(
		async ({ id }: { id: string }) => structuredClone(meetingOr404(id)),
	);

	clientMock.meetings.registerAttendance.mockImplementation(
		async ({
			id,
			userIds,
			kpiId,
		}: {
			id: string;
			userIds: string[];
			kpiId: string;
		}) => {
			const meeting = meetingOr404(id);
			const source = [PRESENCE, ON_TIME].find((item) => item.id === kpiId);
			if (!source) throw new Error("kpi");

			for (const userId of userIds) {
				const member = MEMBERS.find((item) => item.id === userId);
				if (!member) continue;
				const row = meeting.attendees.find((a) => a.userId === userId);
				if (row?.presentAt) continue;
				if (row) {
					row.presentAt = new Date();
				} else {
					meeting.attendees.push({
						userId,
						name: member.name,
						position: member.position,
						presentAt: new Date(),
						points: 0,
					});
				}
				meeting.assignments.push(assignmentFor(meeting, source, userId));
			}
			return save(meeting);
		},
	);

	clientMock.meetings.assignKpi.mockImplementation(
		async ({
			id,
			kpiId,
			userId,
		}: {
			id: string;
			kpiId: string;
			userId: string;
		}) => {
			const meeting = meetingOr404(id);
			const present = meeting.attendees.some(
				(a) => a.userId === userId && a.presentAt,
			);
			if (!present) {
				throw new ORPCError("CONFLICT", {
					data: { code: "ATTENDEE_NOT_PRESENT" },
				});
			}
			const source = [PRESENCE, ON_TIME, IDEA].find(
				(item) => item.id === kpiId,
			);
			if (!source) throw new Error("kpi");
			const assignment = assignmentFor(meeting, source, userId);
			meeting.assignments.push(assignment);
			save(meeting);
			return assignment;
		},
	);

	clientMock.assignments.revoke.mockImplementation(
		async ({ id }: { id: string }) => {
			for (const meeting of db.meetings.values()) {
				const found = meeting.assignments.find((a) => a.id === id);
				if (found) {
					found.revokedAt = new Date();
					return found;
				}
			}
			throw new Error("assignment");
		},
	);

	clientMock.meetings.end.mockImplementation(async ({ id }: { id: string }) => {
		const meeting = meetingOr404(id);
		meeting.status = "CLOSED";
		meeting.closedAt = new Date();
		return save(meeting);
	});
});

const onExit = vi.fn();

function Harness({ initialId }: { initialId?: string }) {
	const [meetingId, setMeetingId] = useState(initialId);
	return (
		<>
			<span data-testid="url">{meetingId ?? "sem-reuniao"}</span>
			<AdminMeetingPage
				meetingId={meetingId}
				onMeetingChange={setMeetingId}
				onExit={onExit}
			/>
		</>
	);
}

function renderPage(initialId?: string) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<Harness initialId={initialId} />
		</QueryClientProvider>,
	);
}

function pick(name: string | RegExp) {
	fireEvent.click(screen.getByRole("button", { name }));
}

describe("Modo reunião — preparação", () => {
	it("lista o time ativo da API e exige presença e KPI de presença", async () => {
		renderPage();

		expect(await screen.findByText("Carla Dias")).toBeInTheDocument();
		const start = screen.getByRole("button", { name: "Iniciar reunião" });
		expect(start).toBeDisabled();

		pick(/Ana Souza/);
		expect(screen.getByText("Escolha o KPI de presença")).toBeInTheDocument();
		expect(start).toBeDisabled();

		pick("Presença na reunião · +5");
		expect(start).toBeEnabled();
	});

	it("pré-seleciona o KPI de presença quando só existe um", async () => {
		clientMock.kpis.list.mockImplementation(async () => ({
			items: [PRESENCE],
			total: 1,
		}));
		renderPage();

		await screen.findByRole("button", { name: /Ana Souza/ });
		pick(/Ana Souza/);
		expect(
			screen.getByRole("button", { name: "Iniciar reunião" }),
		).toBeEnabled();
	});

	it("avisa quando nao ha KPI de presença ativo", async () => {
		clientMock.kpis.list.mockImplementation(async () => ({
			items: [],
			total: 0,
		}));
		renderPage();

		expect(
			await screen.findByText(/Nenhum KPI de presença ativo/),
		).toBeInTheDocument();
	});

	it("cria a reunião de hoje, marca os presentes e abre o modo ao vivo", async () => {
		renderPage();
		await screen.findByText("Carla Dias");

		pick(/Ana Souza/);
		pick(/Bruno Lima/);
		pick("Presença na reunião · +5");
		pick("Iniciar reunião");

		await waitFor(() =>
			expect(
				clientMock.meetings.registerAttendance.mock.lastCall?.[0],
			).toStrictEqual({
				id: "reuniao-1",
				userIds: ["ana", "bruno"],
				kpiId: "presenca",
			}),
		);
		const today = new Date();
		const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
		expect(clientMock.meetings.create.mock.lastCall?.[0]).toStrictEqual({
			title: "Daily da squad",
			date: expectedDate,
		});
		await waitFor(() =>
			expect(screen.getByTestId("url")).toHaveTextContent("reuniao-1"),
		);
		expect(await screen.findByText("Ao vivo")).toBeInTheDocument();
	});

	it("oferece continuar uma reunião que ficou aberta", async () => {
		seedMeeting();
		renderPage();

		const banner = await screen.findByRole("region", {
			name: "Reuniões abertas",
		});
		expect(within(banner).getByText("Daily de terça")).toBeInTheDocument();

		fireEvent.click(within(banner).getByRole("button", { name: "Continuar" }));

		expect(screen.getByTestId("url")).toHaveTextContent("reuniao-1");
	});
});

describe("Modo reunião — ao vivo", () => {
	it("só mostra quem está presente", async () => {
		seedMeeting();
		renderPage("reuniao-1");

		expect(
			await screen.findByRole("button", { name: /Ana Souza/ }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Bruno Lima/ }),
		).not.toBeInTheDocument();
	});

	it("dá o KPI escolhido para quem é tocado", async () => {
		seedMeeting();
		renderPage("reuniao-1");
		await screen.findByRole("button", { name: /Ana Souza/ });

		fireEvent.click(
			await screen.findByRole("button", { name: /^Boa ideia em reunião/ }),
		);
		pick("Dar Boa ideia em reunião para Ana Souza");

		await waitFor(() =>
			expect(clientMock.meetings.assignKpi.mock.lastCall?.[0]).toStrictEqual({
				id: "reuniao-1",
				kpiId: "ideia",
				userId: "ana",
			}),
		);
		expect(
			await screen.findByText("Boa ideia em reunião · +15"),
		).toBeInTheDocument();
	});

	it("desfaz o último reconhecimento pela API", async () => {
		seedMeeting();
		renderPage("reuniao-1");
		await screen.findByRole("button", { name: /Ana Souza/ });

		fireEvent.click(
			await screen.findByRole("button", { name: /^Boa ideia em reunião/ }),
		);
		pick("Dar Boa ideia em reunião para Ana Souza");
		await screen.findByText("Boa ideia em reunião · +15");

		pick("Desfazer");

		await waitFor(() =>
			expect(clientMock.assignments.revoke).toHaveBeenCalledTimes(1),
		);
		await waitFor(() =>
			expect(
				screen.queryByText("Boa ideia em reunião · +15"),
			).not.toBeInTheDocument(),
		);
	});

	it("adiciona quem não entrou no começo, com o escalado marcado", async () => {
		seedMeeting();
		renderPage("reuniao-1");
		await screen.findByRole("button", { name: /Ana Souza/ });

		pick("Adicionar participantes");
		const dialog = await screen.findByRole("dialog");

		expect(within(dialog).queryByText("Ana Souza")).not.toBeInTheDocument();
		const bruno = within(dialog).getByRole("button", { name: /Bruno Lima/ });
		expect(within(bruno).getByText("escalado")).toBeInTheDocument();

		fireEvent.click(bruno);
		fireEvent.click(within(dialog).getByRole("button", { name: /Carla Dias/ }));
		fireEvent.click(
			within(dialog).getByRole("button", { name: "Presença na reunião · +5" }),
		);
		fireEvent.click(
			within(dialog).getByRole("button", { name: "Marcar presença (2)" }),
		);

		await waitFor(() =>
			expect(
				clientMock.meetings.registerAttendance.mock.lastCall?.[0],
			).toStrictEqual({
				id: "reuniao-1",
				userIds: ["bruno", "carla"],
				kpiId: "presenca",
			}),
		);
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(
			await screen.findByRole("button", { name: /Carla Dias/ }),
		).toBeInTheDocument();
	});

	it("encerra só depois de confirmar e mostra o resumo", async () => {
		seedMeeting();
		renderPage("reuniao-1");
		await screen.findByRole("button", { name: /Ana Souza/ });

		pick("Encerrar reunião");
		const confirm = await screen.findByRole("alertdialog");
		expect(clientMock.meetings.end).not.toHaveBeenCalled();

		fireEvent.click(within(confirm).getByRole("button", { name: "Encerrar" }));

		expect(
			await screen.findByText("Reconhecimento registrado."),
		).toBeInTheDocument();
		expect(clientMock.meetings.end.mock.lastCall?.[0]).toStrictEqual({
			id: "reuniao-1",
		});
	});

	it("traduz o erro de dominio ao dar KPI", async () => {
		seedMeeting();
		clientMock.meetings.assignKpi.mockRejectedValueOnce(
			new ORPCError("CONFLICT", { data: { code: "MEETING_CLOSED" } }),
		);
		renderPage("reuniao-1");
		await screen.findByRole("button", { name: /Ana Souza/ });

		fireEvent.click(
			await screen.findByRole("button", { name: /^Boa ideia em reunião/ }),
		);
		pick("Dar Boa ideia em reunião para Ana Souza");

		await waitFor(() =>
			expect(toastMock.error).toHaveBeenCalledWith(
				"Esta reunião já foi encerrada.",
			),
		);
	});
});

describe("Modo reunião — pontos no card", () => {
	it("mostra o total de pontos de cada participante depois de reconhecer", async () => {
		seedMeeting();
		renderPage("reuniao-1");
		const card = await screen.findByRole("button", { name: /Ana Souza/ });
		expect(within(card).queryByText(/^\+\d+$/)).not.toBeInTheDocument();

		fireEvent.click(
			await screen.findByRole("button", { name: /^Boa ideia em reunião/ }),
		);
		pick("Dar Boa ideia em reunião para Ana Souza");

		await waitFor(() =>
			expect(
				within(screen.getByRole("button", { name: /Ana Souza/ })).getByText(
					"+15",
				),
			).toBeInTheDocument(),
		);
	});
});

describe("Modo reunião — encerrada", () => {
	function closedMeeting() {
		const attendee = (userId: string, name: string) => ({
			userId,
			name,
			position: null,
			presentAt: new Date(),
			points: 0,
		});
		const meeting = seedMeeting({
			status: "CLOSED",
			closedAt: new Date(),
			attendees: [
				attendee("ana", "Ana Souza"),
				attendee("bruno", "Bruno Lima"),
				attendee("carla", "Carla Dias"),
			],
		});
		const stored = db.meetings.get("reuniao-1");
		if (!stored) throw new Error("reuniao nao semeada");
		stored.assignments.push(
			assignmentFor(stored, IDEA, "bruno"),
			assignmentFor(stored, IDEA, "bruno"),
			assignmentFor(stored, IDEA, "ana"),
			assignmentFor(stored, PRESENCE, "carla"),
		);
		save(stored);
		return meeting;
	}

	it("resume a reunião: título, duração, atribuições e pontos no total", async () => {
		closedMeeting();
		renderPage("reuniao-1");

		expect(
			await screen.findByText(/4 atribuições, 50 pontos no total\./),
		).toBeInTheDocument();
		expect(screen.getByText(/Daily de terça · /)).toBeInTheDocument();
	});

	it("mostra o pódio com os três que mais pontuaram, com medalha e pontos", async () => {
		closedMeeting();
		renderPage("reuniao-1");

		const podium = await screen.findByRole("list", {
			name: "Pódio da reunião",
		});
		const entries = within(podium).getAllByRole("listitem");

		expect(entries).toHaveLength(3);
		expect(
			within(entries[0] as HTMLElement).getByText("Bruno L."),
		).toBeVisible();
		expect(within(entries[0] as HTMLElement).getByText("+30")).toBeVisible();
		expect(within(entries[0] as HTMLElement).getByText("🥇")).toBeVisible();
		expect(within(entries[1] as HTMLElement).getByText("Ana S.")).toBeVisible();
		expect(within(entries[1] as HTMLElement).getByText("+15")).toBeVisible();
		expect(
			within(entries[2] as HTMLElement).getByText("Carla D."),
		).toBeVisible();
		expect(within(entries[2] as HTMLElement).getByText("+5")).toBeVisible();
	});

	it("reunião sem pontos não mostra pódio", async () => {
		seedMeeting({ status: "CLOSED", closedAt: new Date() });
		renderPage("reuniao-1");

		await screen.findByText("Reconhecimento registrado.");

		expect(
			screen.queryByRole("list", { name: "Pódio da reunião" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByText(/0 atribuições, 0 pontos no total\./),
		).toBeVisible();
	});

	it("abrir uma reunião encerrada mostra o resumo, não o ao vivo", async () => {
		seedMeeting({ status: "CLOSED", closedAt: new Date() });
		renderPage("reuniao-1");

		expect(
			await screen.findByText("Reconhecimento registrado."),
		).toBeInTheDocument();
		expect(screen.queryByText("Ao vivo")).not.toBeInTheDocument();
	});

	it("nova reunião volta para a preparação", async () => {
		seedMeeting({ status: "CLOSED", closedAt: new Date() });
		renderPage("reuniao-1");

		await screen.findByRole("button", { name: "Nova reunião" });
		pick("Nova reunião");

		expect(screen.getByTestId("url")).toHaveTextContent("sem-reuniao");
	});
});
