import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "@kpi-corp/ui/components/alert";
import { Button } from "@kpi-corp/ui/components/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "@kpi-corp/ui/components/field";
import { Input } from "@kpi-corp/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@kpi-corp/ui/components/input-group";
import { Spinner } from "@kpi-corp/ui/components/spinner";
import { useNavigate } from "@tanstack/react-router";
import {
	AlertCircleIcon,
	ArrowRightIcon,
	EyeIcon,
	EyeOffIcon,
	KeyRoundIcon,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { homeRouteFor, InvalidCredentialsError, signIn } from "@/lib/auth";
import { MOCK_PASSWORD } from "@/mocks/users";

const loginSchema = z.object({
	email: z.email("Informe um e-mail válido."),
	password: z.string().min(1, "Informe sua senha."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
	const navigate = useNavigate();
	const [formError, setFormError] = useState<string | null>(null);
	const [showPassword, setShowPassword] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: "", password: "" },
	});

	const onSubmit = handleSubmit(async (values) => {
		setFormError(null);
		try {
			const session = signIn(values.email, values.password);
			await navigate({ to: homeRouteFor(session.role) });
		} catch (error) {
			setFormError(
				error instanceof InvalidCredentialsError
					? error.message
					: "Não foi possível entrar. Tente novamente.",
			);
		}
	});

	return (
		<section className="grid place-items-center p-6 lg:p-10">
			<form
				noValidate
				onSubmit={onSubmit}
				className="flex w-full max-w-[380px] flex-col gap-4"
			>
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

				{formError && (
					<Alert variant="destructive">
						<AlertCircleIcon />
						<AlertDescription>{formError}</AlertDescription>
					</Alert>
				)}

				<FieldGroup className="gap-4">
					<Field data-invalid={errors.email ? true : undefined}>
						<FieldLabel htmlFor="email">E-mail</FieldLabel>
						<Input
							id="email"
							type="email"
							autoComplete="email"
							placeholder="você@empresa.com"
							aria-invalid={errors.email ? true : undefined}
							{...register("email")}
						/>
						{errors.email && <FieldError>{errors.email.message}</FieldError>}
					</Field>

					<Field data-invalid={errors.password ? true : undefined}>
						<div className="flex items-center justify-between">
							<FieldLabel htmlFor="password">Senha</FieldLabel>
							<a
								href="/login"
								className="text-[11px] text-primary hover:underline"
							>
								esqueci
							</a>
						</div>
						<InputGroup>
							<InputGroupInput
								id="password"
								type={showPassword ? "text" : "password"}
								autoComplete="current-password"
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
						{errors.password && (
							<FieldError>{errors.password.message}</FieldError>
						)}
					</Field>
				</FieldGroup>

				<Button type="submit" size="lg" disabled={isSubmitting}>
					{isSubmitting ? (
						<>
							<Spinner data-icon="inline-start" />
							Entrando…
						</>
					) : (
						<>
							Entrar
							<ArrowRightIcon data-icon="inline-end" />
						</>
					)}
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

				{/* Atalho do protótipo — sai junto com os mocks quando a API existir. */}
				<p className="rounded-sm border border-dashed px-3 py-2 text-center text-[11px] text-fg-3">
					Mock: <span className="text-fg-1">ana.souza@kpicorp.io</span> (admin)
					ou <span className="text-fg-1">bruno.c@kpicorp.io</span> (membro) ·
					senha <span className="text-fg-1">{MOCK_PASSWORD}</span>
				</p>
			</form>
		</section>
	);
}
