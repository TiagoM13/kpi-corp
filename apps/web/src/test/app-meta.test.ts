import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-meta";

const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

function attr(source: string, pattern: RegExp) {
	return source.match(pattern)?.[1] ?? null;
}

describe("metadados da pagina", () => {
	it("o titulo do index.html e o do router sao o mesmo", () => {
		expect(attr(html, /<title>([^<]*)<\/title>/)).toBe(APP_NAME);
	});

	it("a descricao do index.html e a do router sao a mesma", () => {
		const description = attr(
			html,
			/<meta\s+name="description"\s+content="([^"]*)"/s,
		);

		expect(description).toBe(APP_DESCRIPTION);
	});

	it("nao sobrou placeholder do scaffold", () => {
		expect(html).not.toContain("kpi-corp is a web application");
		expect(html).not.toMatch(/<title>kpi-corp<\/title>/);
	});

	it("todo icone declarado existe em public/", () => {
		const hrefs = [
			...html.matchAll(
				/(?:href|content)="(\/[^"]+\.(?:svg|png|webmanifest))"/g,
			),
		]
			.map((match) => match[1])
			.filter((href) => href !== undefined);

		expect(hrefs.length).toBeGreaterThan(0);

		for (const href of hrefs) {
			expect(() =>
				readFileSync(resolve(process.cwd(), "public", href.slice(1))),
			).not.toThrow();
		}
	});
});
