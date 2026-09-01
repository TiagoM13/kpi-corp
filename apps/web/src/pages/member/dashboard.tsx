import { Button } from "@kpi-corp/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@kpi-corp/ui/components/empty";
import { Link } from "@tanstack/react-router";
import { SproutIcon } from "lucide-react";
import { MemberDetail } from "@/components/member-detail";
import { firstNameOf } from "@/lib/dashboard";
import { PERIOD_SLUGS } from "@/lib/ranking";
import { MEMBER_BY_ID } from "@/mocks/members";

type MemberDashboardPageProps = {
	memberId: string;
	name: string;
};

export function MemberDashboardPage({
	memberId,
	name,
}: MemberDashboardPageProps) {
	const member = MEMBER_BY_ID.get(memberId);

	if (!member) {
		return (
			<Empty className="border">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<SproutIcon />
					</EmptyMedia>
					<EmptyTitle>
						{firstNameOf(name)}, você ainda não tem pontuação
					</EmptyTitle>
					<EmptyDescription>
						Seus pontos, nível e conquistas aparecem aqui assim que o primeiro
						KPI for reconhecido.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button
						variant="outline"
						render={
							<Link to="/ranking" search={{ periodo: PERIOD_SLUGS.all }} />
						}
					>
						Ver o ranking do time
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	return <MemberDetail member={member} />;
}
