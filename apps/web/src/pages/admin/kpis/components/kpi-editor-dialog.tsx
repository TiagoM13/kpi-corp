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
import { Input } from "@kpi-corp/ui/components/input";
import { Textarea } from "@kpi-corp/ui/components/textarea";
import { XIcon } from "lucide-react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { OverlayHeader } from "@/components/overlay-header";
import {
	type KpiDraft,
	selectCreateKpi,
	selectUpdateKpi,
	useKpiStore,
} from "@/lib/kpi-store";
import type { Kpi } from "@/mocks/kpis";
import { type KpiFormValues, kpiFormDefaults, kpiFormSchema } from "../schemas";
import { KpiCategoryField } from "./kpi-category-field";
import { KpiPointsField } from "./kpi-points-field";
import { KpiPreview } from "./kpi-preview";

type KpiEditorDialogProps = {
	kpi: Kpi | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function KpiEditorDialog({
	kpi,
	open,
	onOpenChange,
}: KpiEditorDialogProps) {
	const nameId = useId();
	const descriptionId = useId();

	const createKpi = useKpiStore(selectCreateKpi);
	const updateKpi = useKpiStore(selectUpdateKpi);

	const {
		control,
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<KpiFormValues>({
		resolver: zodResolver(kpiFormSchema),
		defaultValues: kpiFormDefaults(kpi),
	});

	const onSubmit = handleSubmit((values) => {
		const draft: KpiDraft = values;

		if (kpi) {
			updateKpi(kpi.id, draft);
			toast.success("KPI atualizado");
		} else {
			createKpi(draft);
			toast.success(`KPI “${draft.name}” criado`);
		}

		onOpenChange(false);
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
									aria-label="Fechar editor de KPI"
								/>
							}
						>
							<XIcon />
						</DialogClose>
					}
				>
					<DialogTitle className="font-semibold text-base text-foreground">
						{kpi ? "Editar KPI" : "Novo KPI"}
					</DialogTitle>
				</OverlayHeader>

				<form
					noValidate
					onSubmit={onSubmit}
					className="flex min-h-0 flex-1 flex-col"
				>
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
						<FieldGroup className="gap-4">
							<Field data-invalid={errors.name ? true : undefined}>
								<FieldLabel htmlFor={nameId}>Nome</FieldLabel>
								<Input
									id={nameId}
									placeholder="ex. Mentoria de novato"
									aria-invalid={errors.name ? true : undefined}
									{...register("name")}
								/>
								{errors.name && <FieldError>{errors.name.message}</FieldError>}
							</Field>

							<Field data-invalid={errors.description ? true : undefined}>
								<FieldLabel htmlFor={descriptionId}>Descrição</FieldLabel>
								<Textarea
									id={descriptionId}
									rows={3}
									placeholder="O que precisa acontecer pra ganhar este KPI?"
									aria-invalid={errors.description ? true : undefined}
									{...register("description")}
								/>
								{errors.description && (
									<FieldError>{errors.description.message}</FieldError>
								)}
							</Field>
						</FieldGroup>

						<KpiCategoryField control={control} />
						<KpiPointsField control={control} />
						<KpiPreview control={control} />
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
							{kpi ? "Salvar alterações" : "Criar KPI"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
