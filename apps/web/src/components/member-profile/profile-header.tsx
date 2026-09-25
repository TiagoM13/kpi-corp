import type { ReactNode } from "react";
import { LevelRing } from "@/components/level-ring";
import { UserAvatar } from "@/components/user-avatar";
import type { MemberProfile } from "@/lib/members";

const joinedFormat = new Intl.DateTimeFormat("pt-BR", {
	month: "long",
	year: "numeric",
});

type ProfileHeaderProps = {
	name: string;
	position: string | null;
	level: MemberProfile["level"];
	badges: ReactNode;
	email?: string;
	joinedAt?: Date;
};

export function ProfileHeader({
	name,
	position,
	level,
	badges,
	email,
	joinedAt,
}: ProfileHeaderProps) {
	const details = [position, email].filter(Boolean);

	return (
		<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
			<div className="flex min-w-0 items-start gap-3 sm:contents">
				<UserAvatar
					name={name}
					className="size-16 text-xl sm:order-1 sm:size-24 sm:text-3xl"
				/>

				<div className="flex min-w-0 flex-1 flex-col gap-2 sm:order-2">
					<div className="flex flex-wrap items-center gap-1.5">{badges}</div>

					<h2 className="font-bold text-title tracking-tight sm:text-heading">
						{name}
					</h2>

					{details.length > 0 && (
						<p className="wrap-break-word min-w-0 text-fg-2 text-sm">
							{details.join(" · ")}
						</p>
					)}

					{joinedAt && (
						<span className="text-fg-3 text-xs">
							Entrou em {joinedFormat.format(joinedAt)}
						</span>
					)}
				</div>
			</div>

			<LevelRing
				points={level.currentPoints}
				progress={{ level: level.level, percent: level.progress }}
				className="size-28 self-center sm:order-3 sm:size-24 sm:self-start"
			/>
		</header>
	);
}
