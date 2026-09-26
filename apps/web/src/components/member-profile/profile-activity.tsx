import { Button } from "@kpi-corp/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { Skeleton } from "@kpi-corp/ui/components/skeleton";
import { CircleSlashIcon, TriangleAlertIcon } from "lucide-react";
import { AchievementGrid } from "@/components/member-detail/achievement-grid";
import { CategoryBreakdown } from "@/components/member-detail/category-breakdown";
import {
	achievementsOfProfile,
	categorySharesOf,
	type MemberProfile,
} from "@/lib/members";
import { KpiHistory } from "./kpi-history";

export function ProfileActivity({ profile }: { profile: MemberProfile }) {
	return (
		<>
			<div className="grid gap-3 lg:grid-cols-2">
				<CategoryBreakdown shares={categorySharesOf(profile.categories)} />
				<AchievementGrid achievements={achievementsOfProfile(profile.badges)} />
			</div>

			<KpiHistory kpis={profile.kpis} />
		</>
	);
}

export function ProfileActivitySkeleton() {
	return (
		<div aria-busy className="flex flex-col gap-3">
			<span className="sr-only">Carregando perfil…</span>
			<div className="grid gap-3 lg:grid-cols-2">
				<Skeleton className="h-48 rounded-lg" />
				<Skeleton className="h-48 rounded-lg" />
			</div>
			<Skeleton className="h-64 rounded-lg" />
		</div>
	);
}

export function InactiveNotice() {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<CircleSlashIcon />
				</EmptyMedia>
				<EmptyTitle>Membro inativo</EmptyTitle>
				<EmptyDescription>
					Histórico, categorias e conquistas só aparecem para membros ativos.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

export function ProfileError({ onRetry }: { onRetry: () => void }) {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<TriangleAlertIcon />
				</EmptyMedia>
				<EmptyTitle>Não deu para carregar o perfil</EmptyTitle>
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
