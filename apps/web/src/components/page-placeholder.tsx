import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import type { LucideIcon } from "lucide-react";

type PagePlaceholderProps = {
	title: string;
	description: string;
	icon: LucideIcon;
};

export function PagePlaceholder({
	title,
	description,
	icon: Icon,
}: PagePlaceholderProps) {
	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-1">
				<h1 className="font-semibold text-[22px] tracking-[-0.02em]">
					{title}
				</h1>
				<p className="text-[13px] text-fg-2">{description}</p>
			</header>

			<Empty className="border">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Icon />
					</EmptyMedia>
					<EmptyTitle>Tela ainda não implementada</EmptyTitle>
					<EmptyDescription>
						A navegação já funciona. O conteúdo entra na story desta tela.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</div>
	);
}
