import { Button } from "@kpi-corp/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "@kpi-corp/ui/components/sheet";
import { Link } from "@tanstack/react-router";
import {
	LayoutDashboardIcon,
	LogOutIcon,
	MenuIcon,
	PlayIcon,
	TargetIcon,
	TrophyIcon,
	UsersIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
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

function BrandMark() {
	return (
		<div className="flex items-center gap-3">
			<KpiCorpLogo className="size-6 text-primary" />
			<div className="flex flex-col">
				<span className="font-bold text-base/tighter tracking-tight">
					KPICorp
				</span>
				<span className="text-2xs/tighter text-fg-3">Squad Produto</span>
			</div>
		</div>
	);
}

function SidebarNav({
	items,
	onNavigate,
}: {
	items: NavItem[];
	onNavigate?: () => void;
}) {
	return (
		<nav className="flex flex-1 flex-col gap-1">
			{items.map(({ to, label, icon: NavIcon, exact }) => (
				<Link
					key={to}
					to={to}
					onClick={onNavigate}
					activeOptions={{ exact: exact ?? false }}
					className="relative flex items-center gap-3 rounded-sm px-2.5 py-2 text-fg-1 text-sm transition-colors hover:bg-muted data-[status=active]:bg-secondary data-[status=active]:font-medium data-[status=active]:text-foreground"
				>
					{({ isActive }) => (
						<>
							{isActive && (
								<span className="absolute top-1/2 -left-3.5 h-4.5 w-0.75 -translate-y-1/2 rounded-xs bg-primary" />
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
	);
}

function roleLabelOf({ role, position }: Session) {
	if (role === "ADMIN") {
		return position ? `Admin · ${position}` : "Admin";
	}

	return position ?? "—";
}

function SessionCard({
	session,
	onSignOut,
}: {
	session: Session;
	onSignOut: () => void;
}) {
	return (
		<div className="flex items-center gap-3 rounded-sm px-2.5 py-2">
			<UserAvatar name={session.name} />
			<div className="flex min-w-0 flex-1 flex-col leading-tight">
				<span className="truncate font-medium text-xs">{session.name}</span>
				<span className="truncate text-2xs text-fg-3">
					{roleLabelOf(session)}
				</span>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				title="Sair"
				aria-label="Sair"
				onClick={onSignOut}
			>
				<LogOutIcon />
			</Button>
		</div>
	);
}

export function AppShell({
	session,
	children,
}: {
	session: Session;
	children: ReactNode;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const navItems = session.role === "ADMIN" ? ADMIN_NAV : MEMBER_NAV;

	function handleSignOut() {
		setMenuOpen(false);
		void signOut();
	}

	return (
		<div className="grid min-h-svh md:grid-cols-shell">
			<aside className="sticky top-0 hidden h-svh flex-col border-r bg-sidebar px-3.5 py-5 md:flex">
				<div className="px-2 pt-1 pb-4">
					<BrandMark />
				</div>

				<SidebarNav items={navItems} />

				<div className="mt-3 border-t pt-3">
					<SessionCard session={session} onSignOut={handleSignOut} />
				</div>
			</aside>

			<header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-sidebar px-4 md:hidden">
				<BrandMark />

				<Sheet open={menuOpen} onOpenChange={setMenuOpen}>
					<SheetTrigger
						render={
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Abrir menu"
							/>
						}
					>
						<MenuIcon />
					</SheetTrigger>

					<SheetContent
						side="left"
						className="bg-sidebar px-3.5 py-5 data-[side=left]:w-64"
					>
						<SheetTitle className="sr-only">Menu de navegação</SheetTitle>

						<div className="px-2 pt-1 pb-4">
							<BrandMark />
						</div>

						<SidebarNav
							items={navItems}
							onNavigate={() => setMenuOpen(false)}
						/>

						<div className="mt-3 border-t pt-3">
							<SessionCard session={session} onSignOut={handleSignOut} />
						</div>
					</SheetContent>
				</Sheet>
			</header>

			<main className="w-full min-w-0 max-w-7xl px-4 pt-6 pb-12 md:px-10 md:pt-8 md:pb-14">
				{children}
			</main>
		</div>
	);
}
