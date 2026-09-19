import z from "zod";

export const kpiCategorySchema = z.enum([
	"PRESENCE",
	"PERFORMANCE",
	"BEHAVIOR",
	"INITIATIVE",
]);

export const meetingStatusSchema = z.enum(["OPEN", "CLOSED"]);

const meetingCreatorSchema = z.object({
	id: z.string(),
	name: z.string(),
});

const meetingAttendeeSchema = z.object({
	userId: z.string(),
	name: z.string(),
	position: z.string().nullable(),
	presentAt: z.date().nullable(),
});

// Mesmo shape que a 2B devolve: o mesmo dado nao pode ter duas formas por
// ter entrado por outra porta. Redeclarado aqui porque modulo nao importa
// de modulo.
const meetingAssignmentKpiSchema = z.object({
	id: z.string(),
	name: z.string(),
	category: kpiCategorySchema,
});

export const meetingAssignmentSchema = z.object({
	id: z.string(),
	kpiId: z.string(),
	userId: z.string(),
	assignedBy: z.string(),
	meetingId: z.string().nullable(),
	note: z.string().nullable(),
	points: z.number(),
	revokedAt: z.date().nullable(),
	assignedAt: z.date(),
	kpi: meetingAssignmentKpiSchema,
});

export const meetingDetailSchema = z.object({
	id: z.string(),
	title: z.string(),
	date: z.date(),
	status: meetingStatusSchema,
	closedAt: z.date().nullable(),
	createdAt: z.date(),
	createdBy: meetingCreatorSchema,
	attendees: z.array(meetingAttendeeSchema),
	assignments: z.array(meetingAssignmentSchema),
});

const meetingListItemSchema = z.object({
	id: z.string(),
	title: z.string(),
	date: z.date(),
	status: meetingStatusSchema,
	closedAt: z.date().nullable(),
	attendeeCount: z.number(),
	presentCount: z.number(),
	assignmentCount: z.number(),
});

export const listMeetingsResponseSchema = z.object({
	items: z.array(meetingListItemSchema),
	page: z.number(),
	limit: z.number(),
	total: z.number(),
	totalPages: z.number(),
});

// Data do calendario, nao instante: aceita YYYY-MM-DD.
const calendarDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.transform((value, context) => {
		const date = new Date(value);

		// Round-trip rejeita data invalida que o parser tolera (2026-02-30
		// viraria 2026-03-02 em silencio).
		if (
			Number.isNaN(date.getTime()) ||
			date.toISOString().slice(0, 10) !== value
		) {
			context.addIssue({
				code: "custom",
				message: "date must be a valid calendar date",
			});
			return z.NEVER;
		}

		return date;
	});

export const createMeetingInputSchema = z.object({
	title: z.string().trim().min(1).max(120),
	date: calendarDateSchema,
});

export const meetingIdInputSchema = z.object({
	id: z.uuid(),
});

const userIdsSchema = z
	.array(z.uuid())
	.min(1)
	.max(200)
	.refine((ids) => new Set(ids).size === ids.length, {
		message: "userIds must not contain duplicates",
	});

export const addAttendeesInputSchema = z.object({
	id: z.uuid(),
	userIds: userIdsSchema,
});

export const registerAttendanceInputSchema = z.object({
	id: z.uuid(),
	userIds: userIdsSchema,
	kpiId: z.uuid(),
});

export const assignMeetingKpiInputSchema = z.object({
	id: z.uuid(),
	kpiId: z.uuid(),
	userId: z.uuid(),
	note: z.string().trim().max(500).nullish(),
});

const emptyAsUndefined = (value: unknown) =>
	typeof value === "string" && value.trim() === "" ? undefined : value;

export const listMeetingsInputSchema = z.object({
	status: z.preprocess(
		emptyAsUndefined,
		z.enum(["OPEN", "CLOSED", "ALL"]).default("ALL"),
	),
	from: z.preprocess(emptyAsUndefined, calendarDateSchema.optional()),
	to: z.preprocess(emptyAsUndefined, calendarDateSchema.optional()),
	page: z.preprocess(
		emptyAsUndefined,
		z.coerce.number().int().min(1).default(1),
	),
	limit: z.preprocess(
		emptyAsUndefined,
		z.coerce.number().int().min(1).max(100).default(20),
	),
});
