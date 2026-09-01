import { Button } from "@kpi-corp/ui/components/button";
import {
	Empty,
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
import { SearchIcon, SendIcon, UsersIcon } from "lucide-react";
import {
	lazy,
	Suspense,
	useCallback,
	useDeferredValue,
	useMemo,
	useState,
} from "react";
import { type Member, MOCK_MEMBERS } from "@/mocks/members";
import { MemberCard } from "./components/member-card";
import { MembersTable } from "./components/members-table";

const MemberDetailDrawer = lazy(() =>
	import("@/components/member-detail").then((module) => ({
		default: module.MemberDetailDrawer,
	})),
);

const InviteDialog = lazy(() =>
	import("./components/invite-dialog").then((module) => ({
		default: module.InviteDialog,
	})),
);

function filterMembers(members: Member[], term: string) {
	const query = term.trim().toLowerCase();
	if (query === "") return members;

	return members.filter(
		(member) =>
			member.name.toLowerCase().includes(query) ||
			member.position.toLowerCase().includes(query),
	);
}

export function AdminMembersPage() {
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search);
	const members = useMemo(
		() => filterMembers(MOCK_MEMBERS, deferredSearch),
		[deferredSearch],
	);

	const [selected, setSelected] = useState<Member | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [inviteLoaded, setInviteLoaded] = useState(false);
	const [inviteOpen, setInviteOpen] = useState(false);

	const openMember = useCallback((member: Member) => {
		setSelected(member);
		setDetailOpen(true);
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
						{MOCK_MEMBERS.length} membros
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
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Buscar membro…"
							aria-label="Buscar membro por nome ou cargo"
						/>
					</InputGroup>

					<Button type="button" onClick={openInvite}>
						<SendIcon data-icon="inline-start" />
						Convidar
					</Button>
				</div>
			</header>

			{members.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<UsersIcon />
						</EmptyMedia>
						<EmptyTitle>Nenhum membro encontrado</EmptyTitle>
						<EmptyDescription>
							Nada bate com “{deferredSearch.trim()}”. Tente outro nome ou
							cargo.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="rounded-lg border bg-card">
					<ul className="md:hidden">
						{members.map((member) => (
							<MemberCard
								key={member.id}
								member={member}
								onSelect={openMember}
							/>
						))}
					</ul>

					<div className="hidden md:block">
						<MembersTable members={members} onSelect={openMember} />
					</div>
				</div>
			)}

			{selected && (
				<Suspense fallback={null}>
					<MemberDetailDrawer
						member={selected}
						open={detailOpen}
						onOpenChange={setDetailOpen}
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
