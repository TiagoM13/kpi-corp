import z from "zod";

export const kpiCategorySchema = z.enum([
	"PRESENCE",
	"PERFORMANCE",
	"BEHAVIOR",
	"INITIATIVE",
]);

const assignmentKpiSchema = z.object({
	id: z.string(),
	name: z.string(),
	category: kpiCategorySchema,
});

export const kpiAssignmentSchema = z.object({
	id: z.string(),
	kpiId: z.string(),
	userId: z.string(),
	assignedBy: z.string(),
	meetingId: z.string().nullable(),
	note: z.string().nullable(),
	points: z.number(),
	revokedAt: z.date().nullable(),
	assignedAt: z.date(),
	kpi: assignmentKpiSchema,
});

export const kpiAssignmentResponseSchema = kpiAssignmentSchema;

export const listKpiAssignmentsResponseSchema = z.object({
	items: z.array(kpiAssignmentSchema),
});

export const assignmentHistoryItemSchema = kpiAssignmentSchema.extend({
	user: z.object({
		id: z.string(),
		name: z.string(),
		position: z.string().nullable(),
	}),
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

const booleanFromQuery = (value: unknown) => {
	if (typeof value !== "string") {
		return value;
	}

	const normalized = value.trim().toLowerCase();

	if (normalized === "") {
		return undefined;
	}

	if (normalized === "true") {
		return true;
	}

	if (normalized === "false") {
		return false;
	}

	return normalized;
};

export const listMemberKpiAssignmentsInputSchema = z.object({
	id: z.uuid(),
	category: kpiCategorySchema.optional(),
	revoked: z.preprocess(booleanFromQuery, z.boolean().optional()),
});

const emptyAsUndefined = (value: unknown) =>
	typeof value === "string" && value.trim() === "" ? undefined : value;

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
