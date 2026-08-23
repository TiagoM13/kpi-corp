import { Button } from "@kpi-corp/ui/components/button";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "@kpi-corp/ui/components/field";
import { Input } from "@kpi-corp/ui/components/input";
import { ArrowRightIcon, KeyRoundIcon } from "lucide-react";
import { useState } from "react";

import { getRole, type Role, RoleToggle } from "./role-toggle";

export function LoginForm() {
	const [role, setRole] = useState<Role>("admin");

	return (
		<section className="grid place-items-center p-6 lg:p-10">
			<form className="flex w-full max-w-[380px] flex-col gap-4">
				<div className="flex flex-col gap-2">
					<span className="font-medium text-[10.5px] text-fg-2 uppercase tracking-[0.1em]">
						Entrar
					</span>
					<h2 className="font-semibold text-[28px] tracking-[-0.02em]">
						Bem-vindo de volta
					</h2>
					<p className="text-[13px] text-fg-2">
						Use o e-mail corporativo. Convidados acessam pelo link que o chefe
						enviou.
					</p>
				</div>

				<RoleToggle value={role} onValueChange={setRole} />

				<FieldGroup className="gap-4">
					<Field>
						<FieldLabel htmlFor="email">E-mail</FieldLabel>
						<Input
							id="email"
							type="email"
							autoComplete="email"
							placeholder="você@empresa.com"
						/>
					</Field>
					<Field>
						<div className="flex items-center justify-between">
							<FieldLabel htmlFor="password">Senha</FieldLabel>
							<a
								href="/login"
								className="text-[11px] text-primary hover:underline"
							>
								esqueci
							</a>
						</div>
						<Input
							id="password"
							type="password"
							autoComplete="current-password"
						/>
					</Field>
				</FieldGroup>

				<Button type="submit" size="lg">
					Entrar como {getRole(role).cta}
					<ArrowRightIcon data-icon="inline-end" />
				</Button>

				<FieldSeparator>ou</FieldSeparator>

				<Button type="button" variant="outline">
					<KeyRoundIcon data-icon="inline-start" />
					Usar SSO corporativo
				</Button>

				<p className="mt-1 text-center text-[12px] text-fg-3">
					Primeira vez aqui?{" "}
					<span className="text-fg-1">
						Use o link de convite que o chefe enviou.
					</span>
				</p>
			</form>
		</section>
	);
}
