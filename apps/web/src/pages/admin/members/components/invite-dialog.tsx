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
import {
	type InviteOutcome,
	inviteMembers,
	MAX_INVITES_PER_REQUEST,
} from "@/lib/members";

const EMAIL_SEPARATOR = /[\s,;]+/;
const emailSchema = z.email();

export function splitEmails(value: string) {
	return [...new Set(value.split(EMAIL_SEPARATOR).filter(Boolean))];
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
		)
		.refine(
			(value) => splitEmails(value).length <= MAX_INVITES_PER_REQUEST,
			`Envie no máximo ${MAX_INVITES_PER_REQUEST} convites por vez.`,
		),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

function plural(total: number, one: string, many: string) {
	return total === 1 ? one : `${total} ${many}`;
}

export function announceInvites({
	created,
	alreadyRegistered,
	failed,
}: InviteOutcome) {
	if (created.length > 0) {
		toast.success(plural(created.length, "Convite criado", "convites criados"));
	}

	if (alreadyRegistered.length > 0) {
		toast.warning(
			plural(
				alreadyRegistered.length,
				"Um e-mail já tem conta",
				"e-mails já têm conta",
			),
			{ description: alreadyRegistered.join(", ") },
		);
	}

	if (failed.length > 0) {
		toast.error(
			plural(failed.length, "Um convite falhou", "convites falharam"),
			{ description: failed.join(", ") },
		);
	}
}

type InviteDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
	const emailsId = useId();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<InviteFormValues>({
		resolver: zodResolver(inviteFormSchema),
		defaultValues: { emails: "" },
	});

	const onSubmit = handleSubmit(async (values) => {
		try {
			announceInvites(await inviteMembers(splitEmails(values.emails)));
			reset();
			onOpenChange(false);
		} catch {
			toast.error("Não deu para criar os convites. Tente de novo.");
		}
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
