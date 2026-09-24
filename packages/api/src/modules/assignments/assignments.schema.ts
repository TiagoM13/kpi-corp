import z from "zod";

import {
	assignmentHistoryItemSchema,
	booleanFromQuery,
	emptyAsUndefined,
	kpiAssignmentSchema,
	kpiCategorySchema,
} from "../../shared/schemas";

export const kpiAssignmentResponseSchema = kpiAssignmentSchema;

export const listKpiAssignmentsResponseSchema = z.object({
	items: z.array(kpiAssignmentSchema),
});

export const assignmentHistoryResponseSchema = z.object({
	items: z.array(assignmentHistoryItemSchema),
	page: z.number(),
	limit: z.number(),
	total: z.number(),
	totalPages: z.number(),
});

const assignKpiWritableSchema = z.object({
	kpiId: z.uuid(),
	note: z.string().trim().max(500).nullish(),
});

export const assignKpiInputSchema = assignKpiWritableSchema.extend({
	userId: z.uuid(),
});

export const bulkAssignKpisInputSchema = assignKpiWritableSchema.extend({
	userIds: z
		.array(z.uuid())
		.min(1)
		.refine((ids) => new Set(ids).size === ids.length, {
			message: "userIds must not contain duplicates",
		}),
});

export const listMemberKpiAssignmentsInputSchema = z.object({
	id: z.uuid(),
	category: kpiCategorySchema.optional(),
	revoked: z.preprocess(booleanFromQuery, z.boolean().optional()),
});

const calendarDaySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine(
		(value) => {
			const date = new Date(`${value}T00:00:00.000Z`);

			return (
				!Number.isNaN(date.getTime()) &&
				date.toISOString().slice(0, 10) === value
			);
		},
		{ message: "date must be a valid calendar date" },
	);

export const listKpiAssignmentsInputSchema = z
	.object({
		userId: z.preprocess(emptyAsUndefined, z.uuid().optional()),
		kpiId: z.preprocess(emptyAsUndefined, z.uuid().optional()),
		category: z.preprocess(emptyAsUndefined, kpiCategorySchema.optional()),
		from: z.preprocess(emptyAsUndefined, calendarDaySchema.optional()),
		to: z.preprocess(emptyAsUndefined, calendarDaySchema.optional()),
		revoked: z.preprocess(booleanFromQuery, z.boolean().optional()),
		page: z.preprocess(
			emptyAsUndefined,
			z.coerce.number().int().min(1).default(1),
		),
		limit: z.preprocess(
			emptyAsUndefined,
			z.coerce.number().int().min(1).max(100).default(20),
		),
	})
	.refine((input) => !input.from || !input.to || input.from <= input.to, {
		message: "to must not be before from",
		path: ["to"],
	});

export const assignmentIdInputSchema = z.object({
	id: z.uuid(),
});
