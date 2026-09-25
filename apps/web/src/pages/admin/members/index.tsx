import { Button } from "@kpi-corp/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@kpi-corp/ui/components/input-group";
import { Skeleton } from "@kpi-corp/ui/components/skeleton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	SearchIcon,
	SendIcon,
	TriangleAlertIcon,
	UsersIcon,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { MEMBERS_PAGE_SIZE, type MemberListItem } from "@/lib/members";
import { orpc } from "@/utils/orpc";
import { MemberCard } from "./components/member-card";
import { MembersTable } from "./components/members-table";

const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f"];

const MemberProfileDrawer = lazy(() =>
	import("./components/member-profile-drawer").then((module) => ({
		default: module.MemberProfileDrawer,
	})),
);

const MemberStatusDialog = lazy(() =>
	import("./components/member-status-dialog").then((module) => ({
		default: module.MemberStatusDialog,
	})),
);

const InviteDialog = lazy(() =>
	import("./components/invite-dialog").then((module) => ({
		default: module.InviteDialog,
	})),
);

function useDebouncedValue<T>(value: T, delay: number) {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);

	return debounced;
}

function MembersSkeleton() {
	return (
		<div aria-busy className="flex flex-col gap-2 rounded-lg border p-4">
			<span className="sr-only">Carregando membros…</span>
			{SKELETON_ROWS.map((row) => (
				<Skeleton key={row} className="h-10" />
			))}
		</div>
	);
}

function MembersError({ onRetry }: { onRetry: () => void }) {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<TriangleAlertIcon />
				</EmptyMedia>
				<EmptyTitle>Não deu para carregar os membros</EmptyTitle>
				<EmptyDescription>Confira a conexão e tente de novo.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button type="button" variant="outline" onClick={onRetry}>
					Tentar de novo
				</Button>
			</EmptyContent>
		</Empty>
	);
}

function MembersEmpty({ search }: { search: string }) {
	const term = search.trim();

	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<UsersIcon />
				</EmptyMedia>
				<EmptyTitle>Nenhum membro encontrado</EmptyTitle>
				<EmptyDescription>
					{term === ""
						? "Convide alguém para começar o time."
						: `Nada bate com “${term}”. Tente outro nome ou e-mail.`}
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

type MembersPagerProps = {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
};

function MembersPager({ page, totalPages, onPageChange }: MembersPagerProps) {
	if (totalPages <= 1) return null;

	return (
		<nav
			aria-label="Paginação de membros"
			className="flex items-center justify-between gap-3 border-t px-4 py-3"
		>
			<span className="text-fg-3 text-xs tabular-nums">
				Página {page} de {totalPages}
			</span>
			<div className="flex gap-2">
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					aria-label="Página anterior"
					disabled={page <= 1}
					onClick={() => onPageChange(page - 1)}
				>
					<ChevronLeftIcon />
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					aria-label="Próxima página"
					disabled={page >= totalPages}
					onClick={() => onPageChange(page + 1)}
				>
					<ChevronRightIcon />
				</Button>
			</div>
		</nav>
	);
}

type MembersListProps = {
	search: string;
	currentUserId?: string;
	onPageChange: (page: number) => void;
	onSelect: (member: MemberListItem) => void;
	onToggleStatus: (member: MemberListItem) => void;
	query: ReturnType<typeof useMembersQuery>;
};

function useMembersQuery(search: string, page: number) {
	return useQuery(
		orpc.members.list.queryOptions({
			input: { page, limit: MEMBERS_PAGE_SIZE, search, status: "ALL" },
			placeholderData: keepPreviousData,
		}),
	);
}

function MembersList({
	search,
	currentUserId,
	onPageChange,
	onSelect,
	onToggleStatus,
	query,
}: MembersListProps) {
	const { data, isPending, isError, refetch } = query;

	if (isPending) {
		return <MembersSkeleton />;
	}

	if (isError) {
		return <MembersError onRetry={() => void refetch()} />;
	}

	if (data.items.length === 0) {
		return <MembersEmpty search={search} />;
	}

	return (
		<div className="rounded-lg border bg-card">
			<ul className="md:hidden">
				{data.items.map((member) => (
					<MemberCard
						key={member.id}
						member={member}
						isSelf={member.id === currentUserId}
						onSelect={onSelect}
						onToggleStatus={onToggleStatus}
					/>
				))}
			</ul>

			<div className="hidden md:block">
				<MembersTable
					members={data.items}
					currentUserId={currentUserId}
					onSelect={onSelect}
					onToggleStatus={onToggleStatus}
				/>
			</div>

			<MembersPager
				page={data.page}
				totalPages={data.totalPages}
				onPageChange={onPageChange}
			/>
		</div>
	);
}

function membersHeading(total: number | null) {
	if (total === null) return "Membros";
	return total === 1 ? "1 membro" : `${total} membros`;
}

type AdminMembersPageProps = {
	currentUserId?: string;
};

export function AdminMembersPage({ currentUserId }: AdminMembersPageProps) {
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
	const [page, setPage] = useState(1);
	const membersQuery = useMembersQuery(debouncedSearch, page);

	const [selected, setSelected] = useState<MemberListItem | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [statusTarget, setStatusTarget] = useState<MemberListItem | null>(null);
	const [statusOpen, setStatusOpen] = useState(false);
	const [inviteLoaded, setInviteLoaded] = useState(false);
	const [inviteOpen, setInviteOpen] = useState(false);

	const openMember = useCallback((member: MemberListItem) => {
		setSelected(member);
		setDetailOpen(true);
	}, []);

	const requestStatusChange = useCallback((member: MemberListItem) => {
		setStatusTarget(member);
		setStatusOpen(true);
	}, []);

	const openInvite = useCallback(() => {
		setInviteLoaded(true);
		setInviteOpen(true);
	}, []);

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex flex-col gap-2">
					<span className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
						Equipe
					</span>
					<h1 className="font-bold text-heading tracking-tight">
						{membersHeading(membersQuery.data?.total ?? null)}
					</h1>
					<p className="text-fg-2 text-sm">
						Gerencie quem participa e seus perfis.
					</p>
				</div>

				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					<InputGroup className="sm:w-65">
						<InputGroupAddon>
							<SearchIcon className="text-fg-3" />
						</InputGroupAddon>
						<InputGroupInput
							type="search"
							value={search}
							name="search"
							autoComplete="off"
							onChange={(event) => {
								setSearch(event.target.value);
								setPage(1);
							}}
							placeholder="Buscar membro…"
							aria-label="Buscar membro por nome ou e-mail"
						/>
					</InputGroup>

					<Button type="button" onClick={openInvite}>
						<SendIcon data-icon="inline-start" />
						Convidar
					</Button>
				</div>
			</header>

			<MembersList
				search={debouncedSearch}
				onPageChange={setPage}
				currentUserId={currentUserId}
				onSelect={openMember}
				onToggleStatus={requestStatusChange}
				query={membersQuery}
			/>

			{selected && (
				<Suspense fallback={null}>
					<MemberProfileDrawer
						member={selected}
						open={detailOpen}
						onOpenChange={setDetailOpen}
					/>
				</Suspense>
			)}

			{statusTarget && (
				<Suspense fallback={null}>
					<MemberStatusDialog
						member={statusTarget}
						open={statusOpen}
						onOpenChange={setStatusOpen}
					/>
				</Suspense>
			)}

			{inviteLoaded && (
				<Suspense fallback={null}>
					<InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
				</Suspense>
			)}
		</div>
	);
}
