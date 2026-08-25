import { Button } from "@kpi-corp/ui/components/button";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	LayoutDashboardIcon,
	LogOutIcon,
	PlayIcon,
	TargetIcon,
	TrophyIcon,
	UsersIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { type Session, signOut } from "@/lib/auth";
import { KpiCorpLogo } from "./kpi-corp-logo";
import { UserAvatar } from "./user-avatar";

type NavItem = {
	to: string;
	label: string;
	icon: typeof LayoutDashboardIcon;
	exact?: boolean;
};

const ADMIN_NAV: NavItem[] = [
	{ to: "/admin", label: "Painel", icon: LayoutDashboardIcon, exact: true },
	{ to: "/admin/meeting", label: "Modo reunião", icon: PlayIcon },
	{ to: "/admin/kpis", label: "Banco de KPIs", icon: TargetIcon },
	{ to: "/admin/members", label: "Membros", icon: UsersIcon },
	{ to: "/admin/ranking", label: "Ranking", icon: TrophyIcon },
];

const MEMBER_NAV: NavItem[] = [
	{ to: "/dashboard", label: "Meu painel", icon: LayoutDashboardIcon },
	{ to: "/ranking", label: "Ranking", icon: TrophyIcon },
];

export function AppShell({
	session,
	children,
}: {
	session: Session;
	children: ReactNode;
}) {
	const navigate = useNavigate();
	const navItems = session.role === "ADMIN" ? ADMIN_NAV : MEMBER_NAV;

	return (
		<div className="grid min-h-svh grid-cols-[232px_1fr]">
			<aside className="sticky top-0 flex h-svh flex-col border-r bg-sidebar px-3.5 py-5">
				<div className="flex items-center gap-3 px-2 pt-1 pb-4">
					<KpiCorpLogo className="size-6 text-primary" />
					<div className="flex flex-col leading-[1.05]">
						<span className="font-bold text-[15px] tracking-[-0.02em]">
							KPICorp
						</span>
						<span className="text-[10px] text-fg-3">Squad Produto</span>
					</div>
				</div>

				<nav className="flex flex-1 flex-col gap-1">
					{navItems.map(({ to, label, icon: NavIcon, exact }) => (
						<Link
							key={to}
							to={to}
							activeOptions={{ exact: exact ?? false }}
							className="relative flex items-center gap-3 rounded-sm px-2.5 py-2 text-[13px] text-fg-1 transition-colors hover:bg-muted data-[status=active]:bg-secondary data-[status=active]:font-medium data-[status=active]:text-foreground"
						>
							{({ isActive }) => (
								<>
									{isActive && (
										<span className="absolute top-1/2 -left-3.5 h-[18px] w-[3px] -translate-y-1/2 rounded-[2px] bg-primary" />
									)}
									<NavIcon
										className={
											isActive ? "size-4 text-primary" : "size-4 text-fg-2"
										}
									/>
									<span className="flex-1">{label}</span>
								</>
							)}
						</Link>
					))}
				</nav>

				<div className="mt-3 border-t pt-3">
					<div className="flex items-center gap-3 rounded-sm px-2.5 py-2">
						<UserAvatar name={session.name} hue={session.hue} />
						<div className="flex min-w-0 flex-1 flex-col leading-tight">
							<span className="truncate font-medium text-[12.5px]">
								{session.name}
							</span>
							<span className="truncate text-[10.5px] text-fg-3">
								{session.role === "ADMIN"
									? `Admin · ${session.position}`
									: session.position}
							</span>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							title="Sair"
							aria-label="Sair"
							onClick={() => {
								signOut();
								navigate({ to: "/login" });
							}}
						>
							<LogOutIcon />
						</Button>
					</div>
				</div>
			</aside>

			<main className="w-full max-w-7xl px-10 pt-8 pb-14">{children}</main>
		</div>
	);
}
