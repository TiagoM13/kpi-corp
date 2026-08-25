export function KpiCorpLogo({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 32 32" className={className} role="img">
			<title>KPICorp</title>
			<rect x="2" y="2" width="28" height="28" rx="7" fill="currentColor" />
			<path
				d="M9 22 L9 10 L12 10 L12 15 L17 10 L21 10 L15.5 15.5 L21.5 22 L17.5 22 L13 17 L12 18 L12 22 Z"
				fill="var(--background)"
			/>
			<circle cx="23" cy="10" r="2" fill="var(--background)" />
		</svg>
	);
}
