import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Standalone em vez de mergeConfig(viteConfig): testes unitarios nao precisam do
// plugin do TanStack Router nem do Tailwind, e importar ./vite.config obrigaria
// a escolher entre o warning do config loader nativo do Vite (import sem
// extensao) e o TS5097 do tsc (import com extensao .ts).
export default defineConfig({
	plugins: [react()],
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
	},
});
