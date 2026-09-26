import z from "zod";

import { emptyAsUndefined, kpiAssignmentSchema } from "../../shared/schemas";

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
	points: z.number(),
});

const meetingSummarySchema = z.object({
	totalPoints: z.number(),
	podium: z.array(
		z.object({
			userId: z.string(),
			name: z.string(),
			points: z.number(),
		}),
	),
});

export const meetingAssignmentSchema = kpiAssignmentSchema;

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
	summary: meetingSummarySchema,
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
