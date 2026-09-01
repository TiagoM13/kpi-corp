import { Badge } from "@kpi-corp/ui/components/badge";
import { Button } from "@kpi-corp/ui/components/button";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

type MeetingShellProps = {
	title: string;
	live?: ReactNode;
	onExit: () => void;
	children: ReactNode;
};

export function MeetingShell({
	title,
	live,
	onExit,
	children,
}: MeetingShellProps) {
	return (
		<div className="flex min-h-svh flex-col bg-background">
			<header className="sticky top-0 z-10 flex shrink-0 flex-col gap-3 border-b bg-bg-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
				<div className="flex min-w-0 items-center gap-3">
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label="Sair do modo reunião"
						onClick={onExit}
					>
						<XIcon />
					</Button>

					<div className="flex min-w-0 flex-col leading-tight">
						<div className="flex items-center gap-2">
							{live && (
								<Badge
									variant="outline"
									className="border-bad/30 bg-bad/10 text-bad"
								>
									<span
										aria-hidden
										className="size-1.5 rounded-full bg-current motion-safe:animate-pulse"
									/>
									Ao vivo
								</Badge>
							)}
							<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
								Modo reunião
							</span>
						</div>
						<h1 className="truncate font-semibold text-base">{title}</h1>
					</div>
				</div>

				{live}
			</header>

			<main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
		</div>
	);
}
