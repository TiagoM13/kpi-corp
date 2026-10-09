import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const JWT_SECRET_MIN_LENGTH = 32;

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		CORS_ORIGIN: z.url(),
		WEB_APP_URL: z.url(),
		HOST: z.string().min(1).default("localhost"),
		PORT: z.coerce.number().int().positive().default(3000),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		JWT_SECRET: z.string().min(JWT_SECRET_MIN_LENGTH),
		JWT_REFRESH_SECRET: z.string().min(JWT_SECRET_MIN_LENGTH),
		JWT_ACCESS_EXPIRES_IN: z.string().min(1).default("15m"),
		JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("7d"),
	},
	createFinalSchema: (shape) =>
		z
			.object(shape)
			.refine((values) => values.JWT_SECRET !== values.JWT_REFRESH_SECRET, {
				message: "JWT_REFRESH_SECRET must differ from JWT_SECRET",
				path: ["JWT_REFRESH_SECRET"],
			}),
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
