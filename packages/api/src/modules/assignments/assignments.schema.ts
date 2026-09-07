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

export const assignmentIdInputSchema = z.object({
	id: z.uuid(),
});
