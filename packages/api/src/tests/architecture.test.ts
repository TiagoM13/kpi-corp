import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(import.meta.dirname, "..");
const MODULES = join(SRC, "modules");
const SHARED = join(SRC, "shared");

function filesUnder(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = join(dir, entry);

		if (statSync(full).isDirectory()) {
			return filesUnder(full);
		}

		return full.endsWith(".ts") ? [full] : [];
	});
}

const IMPORT = /(?:from|import)\s+["']([^"']+)["']/g;

function importsOf(file: string): string[] {
	return [...readFileSync(file, "utf8").matchAll(IMPORT)].map(
		(match) => match[1] as string,
	);
}

const moduleNames = readdirSync(MODULES).filter((entry) =>
	statSync(join(MODULES, entry)).isDirectory(),
);

describe("module boundaries", () => {
	it("finds the modules to check", () => {
		expect(moduleNames.length).toBeGreaterThan(0);
	});

	it.each(moduleNames)("%s does not import from another module", (name) => {
		const offenders: string[] = [];

		for (const file of filesUnder(join(MODULES, name))) {
			for (const specifier of importsOf(file)) {
				if (!specifier.startsWith(".")) {
					continue;
				}

				const target = resolve(file, "..", specifier);

				if (!target.startsWith(`${MODULES}/`)) {
					continue;
				}

				const reached = relative(MODULES, target).split("/")[0];

				if (reached && reached !== name) {
					offenders.push(
						`${relative(SRC, file)} -> ${specifier} (alcanca o modulo "${reached}")`,
					);
				}
			}
		}

		expect(
			offenders,
			`Um modulo nao importa de outro. O que os dois precisam vai para src/shared/.\n${offenders.join("\n")}`,
		).toEqual([]);
	});

	it("shared does not import from modules", () => {
		const offenders: string[] = [];

		for (const file of filesUnder(SHARED)) {
			for (const specifier of importsOf(file)) {
				const target = specifier.startsWith(".")
					? resolve(file, "..", specifier)
					: specifier;

				if (target.startsWith(MODULES) || target.includes("/modules/")) {
					offenders.push(`${relative(SRC, file)} -> ${specifier}`);
				}
			}
		}

		expect(
			offenders,
			`src/shared/ nao conhece modulo nenhum: a dependencia aponta so para dentro.\n${offenders.join("\n")}`,
		).toEqual([]);
	});

	it("keeps the biome rule in sync with the modules that exist", () => {
		const config = JSON.parse(
			readFileSync(resolve(SRC, "../../../biome.json"), "utf8"),
		) as {
			overrides?: {
				includes?: string[];
				linter?: {
					rules?: {
						style?: {
							noRestrictedImports?: {
								options?: { patterns?: { group?: string[] }[] };
							};
						};
					};
				};
			}[];
		};

		const override = config.overrides?.find((entry) =>
			entry.includes?.some((glob) => glob.includes("api/src/modules")),
		);

		const group =
			override?.linter?.rules?.style?.noRestrictedImports?.options
				?.patterns?.[0]?.group ?? [];

		expect(
			moduleNames.map((name) => `../${name}/**`).sort(),
			"O lint bloqueia irmao por nome, entao modulo novo precisa entrar no group de biome.json. Sem isso o editor para de avisar e so o teste pega.",
		).toEqual([...group].sort());
	});
});
