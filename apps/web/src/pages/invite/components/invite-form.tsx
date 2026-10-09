import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "@kpi-corp/ui/components/alert";
import { Button } from "@kpi-corp/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@kpi-corp/ui/components/field";
import { Input } from "@kpi-corp/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@kpi-corp/ui/components/input-group";
import { Spinner } from "@kpi-corp/ui/components/spinner";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	AlertCircleIcon,
	ArrowRightIcon,
	EyeIcon,
	EyeOffIcon,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { acceptInvite, InvalidInviteError } from "@/lib/invite";

export const MIN_PASSWORD_LENGTH = 8;

export const inviteSchema = z
	.object({
		name: z.string().trim().min(1, "Informe seu nome."),
		position: z.string().trim().min(1, "Informe seu cargo."),
		password: z
			.string()
			.min(
				MIN_PASSWORD_LENGTH,
				`Use ao menos ${MIN_PASSWORD_LENGTH} caracteres.`,
			),
		passwordConfirmation: z.string(),
	})
	.refine((values) => values.password === values.passwordConfirmation, {
		path: ["passwordConfirmation"],
		message: "As senhas não conferem.",
	});

type InviteValues = z.infer<typeof inviteSchema>;

export function InviteForm({ token, email }: { token: string; email: string }) {
	const navigate = useNavigate();
	const [formError, setFormError] = useState<string | null>(null);
	const [showPassword, setShowPassword] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<InviteValues>({
		resolver: zodResolver(inviteSchema),
		defaultValues: {
			name: "",
			position: "",
			password: "",
			passwordConfirmation: "",
		},
	});

	const onSubmit = handleSubmit(async (values) => {
		setFormError(null);
		try {
			await acceptInvite({
				token,
				name: values.name,
				position: values.position,
				password: values.password,
			});
			await navigate({ to: "/dashboard" });
		} catch (error) {
			setFormError(
				error instanceof InvalidInviteError
					? error.message
					: "Não foi possível criar sua conta. Tente novamente.",
			);
		}
	});

	return (
		<section className="grid place-items-center p-6 lg:p-10">
			<form
				noValidate
				onSubmit={onSubmit}
				className="flex w-full max-w-sm flex-col gap-4"
			>
				<div className="flex flex-col gap-2">
					<span className="font-medium text-2xs text-fg-2 uppercase tracking-widest">
						Convite
					</span>
					<h2 className="font-semibold text-heading tracking-tight">
						Crie sua conta
					</h2>
					<p className="text-fg-2 text-sm">
						Você foi convidado para o KPICorp. Complete o cadastro para entrar.
					</p>
				</div>

				{formError && (
					<Alert variant="destructive">
						<AlertCircleIcon />
						<AlertDescription>{formError}</AlertDescription>
					</Alert>
				)}

				<FieldGroup className="gap-4">
					<Field>
						<FieldLabel htmlFor="invite-email">E-mail</FieldLabel>
						<Input
							id="invite-email"
							type="email"
							autoComplete="username"
							value={email}
							readOnly
						/>
						<FieldDescription>
							Definido pelo convite e não pode ser alterado.
						</FieldDescription>
					</Field>

					<Field data-invalid={errors.name ? true : undefined}>
						<FieldLabel htmlFor="invite-name">Nome</FieldLabel>
						<Input
							id="invite-name"
							autoComplete="name"
							placeholder="Como você aparece para o time"
							aria-invalid={errors.name ? true : undefined}
							{...register("name")}
						/>
						{errors.name && <FieldError>{errors.name.message}</FieldError>}
					</Field>

					<Field data-invalid={errors.position ? true : undefined}>
						<FieldLabel htmlFor="invite-position">Cargo</FieldLabel>
						<Input
							id="invite-position"
							autoComplete="organization-title"
							placeholder="Front-end Jr."
							aria-invalid={errors.position ? true : undefined}
							{...register("position")}
						/>
						{errors.position && (
							<FieldError>{errors.position.message}</FieldError>
						)}
					</Field>

					<Field data-invalid={errors.password ? true : undefined}>
						<FieldLabel htmlFor="invite-password">Senha</FieldLabel>
						<InputGroup>
							<InputGroupInput
								id="invite-password"
								type={showPassword ? "text" : "password"}
								autoComplete="new-password"
								placeholder="Crie uma senha"
								aria-invalid={errors.password ? true : undefined}
								{...register("password")}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupButton
									onClick={() => setShowPassword((visible) => !visible)}
									aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
								>
									{showPassword ? <EyeOffIcon /> : <EyeIcon />}
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
						{errors.password ? (
							<FieldError>{errors.password.message}</FieldError>
						) : (
							<FieldDescription>
								Ao menos {MIN_PASSWORD_LENGTH} caracteres.
							</FieldDescription>
						)}
					</Field>

					<Field data-invalid={errors.passwordConfirmation ? true : undefined}>
						<FieldLabel htmlFor="invite-password-confirmation">
							Confirmar senha
						</FieldLabel>
						<Input
							id="invite-password-confirmation"
							type={showPassword ? "text" : "password"}
							autoComplete="new-password"
							placeholder="Repita a senha"
							aria-invalid={errors.passwordConfirmation ? true : undefined}
							{...register("passwordConfirmation")}
						/>
						{errors.passwordConfirmation && (
							<FieldError>{errors.passwordConfirmation.message}</FieldError>
						)}
					</Field>
				</FieldGroup>

				<Button type="submit" size="lg" disabled={isSubmitting}>
					{isSubmitting ? (
						<>
							<Spinner data-icon="inline-start" />
							Criando conta…
						</>
					) : (
						<>
							Criar conta e entrar
							<ArrowRightIcon data-icon="inline-end" />
						</>
					)}
				</Button>

				<p className="mt-1 text-center text-fg-3 text-xs">
					Já tem conta?{" "}
					<Link to="/login" className="text-primary hover:underline">
						Entrar
					</Link>
				</p>
			</form>
		</section>
	);
}
