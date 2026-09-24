import z from "zod";

import { kpiCategorySchema } from "./kpi";

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
	kpi: z.object({
		id: z.string(),
		name: z.string(),
		category: kpiCategorySchema,
	}),
});

export const assignmentHistoryItemSchema = kpiAssignmentSchema.extend({
	user: z.object({
		id: z.string(),
		name: z.string(),
		position: z.string().nullable(),
	}),
});
