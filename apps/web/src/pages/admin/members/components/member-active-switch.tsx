import { Switch } from "@kpi-corp/ui/components/switch";
import type { MemberListItem } from "@/lib/members";

type MemberActiveSwitchProps = {
	member: MemberListItem;
	isSelf: boolean;
	onRequestToggle: (member: MemberListItem) => void;
};

export function MemberActiveSwitch({
	member,
	isSelf,
	onRequestToggle,
}: MemberActiveSwitchProps) {
	return (
		<Switch
			checked={member.active}
			disabled={isSelf}
			title={isSelf ? "Você não pode desativar a própria conta" : undefined}
			aria-label={`${member.active ? "Desativar" : "Reativar"} ${member.name}`}
			onClick={(event) => event.stopPropagation()}
			onCheckedChange={() => onRequestToggle(member)}
		/>
	);
}
