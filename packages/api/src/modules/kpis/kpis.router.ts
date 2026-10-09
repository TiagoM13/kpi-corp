import { adminProcedure } from "../../index";
import { handle } from "../../shared/errors/handle";
import {
	createKpiInputSchema,
	kpiIdInputSchema,
	kpiResponseSchema,
	listKpisInputSchema,
	listKpisResponseSchema,
	setKpiStatusInputSchema,
	updateKpiInputSchema,
} from "./kpis.schema";
import { kpisService } from "./kpis.service";

export const kpisRouter = {
	create: adminProcedure
		.route({ method: "POST", path: "/kpis" })
		.input(createKpiInputSchema)
		.output(kpiResponseSchema)
		.handler(({ input }) => handle(() => kpisService.create(input))),

	list: adminProcedure
		.route({ method: "GET", path: "/kpis" })
		.input(listKpisInputSchema)
		.output(listKpisResponseSchema)
		.handler(({ input }) => handle(() => kpisService.list(input))),

	getById: adminProcedure
		.route({ method: "GET", path: "/kpis/{id}" })
		.input(kpiIdInputSchema)
		.output(kpiResponseSchema)
		.handler(({ input }) => handle(() => kpisService.getById(input.id))),

	update: adminProcedure
		.route({ method: "PUT", path: "/kpis/{id}" })
		.input(updateKpiInputSchema)
		.output(kpiResponseSchema)
		.handler(({ input }) => handle(() => kpisService.update(input))),

	setStatus: adminProcedure
		.route({ method: "PATCH", path: "/kpis/{id}/status" })
		.input(setKpiStatusInputSchema)
		.output(kpiResponseSchema)
		.handler(({ input }) =>
			handle(() => kpisService.setStatus(input.id, input.active)),
		),
};
