import { Badge } from "@kpi-corp/ui/components/badge";

import { KpiCorpLogo } from "./kpi-corp-logo";

const CATEGORIES = ["Presença", "Desempenho", "Comportamento", "Iniciativa"];

// Glow radial + granulado. Ficam em `style` porque sao gradientes decorativos
// — nao ha utilitario Tailwind equivalente legivel.
const GLOW = {
	background:
		"radial-gradient(circle at 30% 20%, color-mix(in oklab, var(--primary) 22%, var(--background)) 0%, var(--background) 60%)",
} as const;

const GRAIN = {
	backgroundImage:
		"radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.06) 1px, transparent 0)",
	backgroundSize: "4px 4px",
} as const;

export function BrandPanel() {
	return (
		<section className="relative hidden flex-col justify-between overflow-hidden border-r p-12 lg:flex lg:px-14">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={GLOW}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-40"
				style={GRAIN}
			/>

			<div className="relative flex items-center gap-3">
				<KpiCorpLogo className="size-7 text-primary" />
				<div className="flex flex-col">
					<span className="font-bold text-lg/tighter tracking-tight">
						KPICorp
					</span>
					<span className="font-medium text-2xs/tighter text-fg-2 uppercase tracking-widest">
						v 2.4.0
					</span>
				</div>
			</div>

			<div className="relative flex max-w-120 flex-col gap-4">
				<h1 className="font-bold text-display tracking-tighter">
					Reconhecimento que{" "}
					<span className="font-normal font-serif text-primary italic">
						não evapora
					</span>{" "}
					depois da reunião.
				</h1>
				<p className="max-w-110 text-base text-fg-1 leading-relaxed">
					Cadastre KPIs de presença, comportamento e desempenho. Atribua em
					massa no modo reunião. Acompanhe o engajamento sem virar avaliação.
				</p>
				<div className="mt-2 flex flex-wrap gap-2">
					{CATEGORIES.map((category) => (
						<Badge key={category} variant="outline">
							{category}
						</Badge>
					))}
				</div>
			</div>

			<div className="relative flex items-center gap-4 text-fg-3 text-xs">
				<span>© 2026 KPICorp</span>
				<span>·</span>
				<span>Privacidade</span>
				<span>·</span>
				<span>Termos</span>
			</div>
		</section>
	);
}
