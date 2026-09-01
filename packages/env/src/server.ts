import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

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
		JWT_SECRET: z.string().min(1),
		JWT_REFRESH_SECRET: z.string().min(1),
		JWT_ACCESS_EXPIRES_IN: z.string().min(1).default("15m"),
		JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("7d"),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
