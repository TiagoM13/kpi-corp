import {
	ToggleGroup,
	ToggleGroupItem,
} from "@kpi-corp/ui/components/toggle-group";
import { CrownIcon, UserIcon } from "lucide-react";

export const ROLES = [
	{ value: "admin", label: "Chefe / Admin", cta: "Chefe", icon: CrownIcon },
	{ value: "member", label: "Membro", cta: "Membro", icon: UserIcon },
] as const;

export type Role = (typeof ROLES)[number]["value"];

export function getRole(value: Role) {
	return ROLES.find((role) => role.value === value) ?? ROLES[0];
}

type RoleToggleProps = {
	value: Role;
	onValueChange: (role: Role) => void;
};

export function RoleToggle({ value, onValueChange }: RoleToggleProps) {
	return (
		<ToggleGroup
			aria-label="Tipo de acesso"
			spacing={1}
			value={[value]}
			onValueChange={(next: string[]) => {
				// Base UI devolve array e esvazia ao clicar no item ativo.
				// Ignorar o vazio mantem sempre um perfil selecionado.
				const [selected] = next;
				if (selected) {
					onValueChange(selected as Role);
				}
			}}
			className="grid w-full grid-cols-2 rounded-sm border bg-muted p-1"
		>
			{ROLES.map(({ value: roleValue, label, icon: RoleIcon }) => (
				<ToggleGroupItem
					key={roleValue}
					value={roleValue}
					className="w-full border border-transparent text-fg-2 aria-pressed:border-line-2 aria-pressed:bg-secondary aria-pressed:text-foreground"
				>
					<RoleIcon data-icon="inline-start" />
					{label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
