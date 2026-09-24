import z from "zod";

export const kpiCategorySchema = z.enum([
	"PRESENCE",
	"PERFORMANCE",
	"BEHAVIOR",
	"INITIATIVE",
]);
