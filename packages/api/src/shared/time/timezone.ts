// Fuso fixo do produto — o mesmo que profile.badges.ts usa para o streak ISO.
// Mudar de fuso reescreveria o passado (posições e janelas já fechadas), então
// não é configuração de ambiente.
export const TIMEZONE = "America/Sao_Paulo";

const WALL_CLOCK = new Intl.DateTimeFormat("en-US", {
	timeZone: TIMEZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hourCycle: "h23",
});

type WallParts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
};

// Relógio de parede de São Paulo para um instante, partido em campos.
function wallParts(at: Date): WallParts {
	const parts = {} as Record<string, number>;

	for (const part of WALL_CLOCK.formatToParts(at)) {
		if (part.type !== "literal") {
			parts[part.type] = Number(part.value);
		}
	}

	return parts as unknown as WallParts;
}

// O instante em que o relógio de São Paulo marca essa hora, lido como se fosse
// UTC. A diferença entre as duas leituras é o offset do fuso naquele instante.
function wallTimeAsUtc(at: Date): Date {
	const parts = wallParts(at);

	return new Date(
		Date.UTC(
			parts.year,
			parts.month - 1,
			parts.day,
			parts.hour,
			parts.minute,
			parts.second,
		),
	);
}

function offsetMs(at: Date): number {
	return wallTimeAsUtc(at).getTime() - at.getTime();
}

// "YYYY-MM-DD" do calendário de São Paulo para um instante.
export function dayOf(at: Date): string {
	return wallTimeAsUtc(at).toISOString().slice(0, 10);
}

// Primeiro instante de um dia do calendário em São Paulo.
export function dayStart(day: string): Date {
	// O offset é medido ao meio-dia do próprio dia: longe de qualquer virada
	// e estável em dias sem horário de verão (o fuso de SP não tem DST hoje).
	const reference = new Date(`${day}T12:00:00.000Z`);

	return new Date(Date.parse(`${day}T00:00:00.000Z`) - offsetMs(reference));
}

// Primeiro instante FORA do dia — o fim de uma janela é sempre exclusivo.
export function dayEnd(day: string): Date {
	return dayStart(addDays(day, 1));
}

export function addDays(day: string, count: number): string {
	const date = new Date(`${day}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + count);

	return date.toISOString().slice(0, 10);
}
