import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@kpi-corp/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogTitle,
} from "@kpi-corp/ui/components/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@kpi-corp/ui/components/field";
import { Spinner } from "@kpi-corp/ui/components/spinner";
import { Textarea } from "@kpi-corp/ui/components/textarea";
import { BellIcon, SendIcon, XIcon } from "lucide-react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { OverlayHeader } from "@/components/overlay-header";
import { INVITE_TTL_HOURS } from "@/lib/invite";

const EMAIL_SEPARATOR = /[\s,;]+/;
const emailSchema = z.email();

export function splitEmails(value: string) {
	return value.split(EMAIL_SEPARATOR).filter(Boolean);
}

export const inviteFormSchema = z.object({
	emails: z
		.string()
		.trim()
		.min(1, "Informe pelo menos um e-mail.")
		.refine(
			(value) =>
				splitEmails(value).every(
					(email) => emailSchema.safeParse(email).success,
				),
			"Algum e-mail da lista não é válido.",
		),
	message: z.string().max(500, "Mensagem muito longa.").optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

const DEFAULT_MESSAGE =
	"Oi! Você foi convidado(a) pro KPICorp do nosso time. Bora reconhecer o que tá rolando de bom por aqui.";

type InviteDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
	const emailsId = useId();
	const messageId = useId();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<InviteFormValues>({
		resolver: zodResolver(inviteFormSchema),
		defaultValues: { emails: "", message: DEFAULT_MESSAGE },
	});

	const onSubmit = handleSubmit((values) => {
		const total = splitEmails(values.emails).length;
		toast.success(
			total === 1 ? "Convite enviado" : `${total} convites enviados`,
		);
		reset();
		onOpenChange(false);
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) reset();
				onOpenChange(next);
			}}
		>
			<DialogContent
				showCloseButton={false}
				className="flex max-h-[85svh] flex-col gap-0 overflow-hidden rounded-lg bg-bg-1 p-0 sm:max-w-lg"
			>
				<OverlayHeader
					close={
						<DialogClose
							render={
								<Button
									type="button"
									variant="outline"
									size="icon"
									aria-label="Fechar convite"
								/>
							}
						>
							<XIcon />
						</DialogClose>
					}
				>
					<DialogTitle className="font-semibold text-base text-foreground">
						Convidar membros
					</DialogTitle>
				</OverlayHeader>

				<form
					noValidate
					onSubmit={onSubmit}
					className="flex min-h-0 flex-1 flex-col"
				>
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
						<FieldGroup className="gap-4">
							<Field data-invalid={errors.emails ? true : undefined}>
								<FieldLabel htmlFor={emailsId}>
									E-mails (separados por vírgula ou Enter)
								</FieldLabel>
								<Textarea
									id={emailsId}
									rows={3}
									placeholder="alguem@empresa.com, outro@empresa.com"
									aria-invalid={errors.emails ? true : undefined}
									{...register("emails")}
								/>
								{errors.emails && (
									<FieldError>{errors.emails.message}</FieldError>
								)}
							</Field>

							<Field data-invalid={errors.message ? true : undefined}>
								<FieldLabel htmlFor={messageId}>Mensagem (opcional)</FieldLabel>
								<Textarea
									id={messageId}
									rows={3}
									aria-invalid={errors.message ? true : undefined}
									{...register("message")}
								/>
								{errors.message && (
									<FieldError>{errors.message.message}</FieldError>
								)}
							</Field>
						</FieldGroup>

						<div className="flex items-center gap-3 rounded-sm border bg-bg-2 p-3">
							<BellIcon className="size-4 shrink-0 text-fg-2" />
							<div className="flex flex-col leading-tight">
								<span className="font-medium text-xs">
									Convite expira em {INVITE_TTL_HOURS}h
								</span>
								<span className="text-2xs text-fg-3">
									Você pode reenviar a qualquer momento.
								</span>
							</div>
						</div>
					</div>

					<DialogFooter className="shrink-0 border-t px-4 py-4 sm:px-6">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? (
								<Spinner data-icon="inline-start" />
							) : (
								<SendIcon data-icon="inline-start" />
							)}
							Enviar convites
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
