import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// packages/env nao depende do Vite, entao o ImportMeta visto aqui nao tem .env
// tipado. Estreitar o cast em vez de usar any preserva a checagem do acesso.
type ImportMetaWithEnv = ImportMeta & {
	readonly env: Record<string, string | undefined>;
};

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url(),
	},
	runtimeEnv: (import.meta as ImportMetaWithEnv).env,
	emptyStringAsUndefined: true,
});
