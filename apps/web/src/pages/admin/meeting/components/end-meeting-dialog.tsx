import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@kpi-corp/ui/components/alert-dialog";
import { Button } from "@kpi-corp/ui/components/button";
import { Spinner } from "@kpi-corp/ui/components/spinner";

type EndMeetingDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pending: boolean;
	onConfirm: () => void;
};

export function EndMeetingDialog({
	open,
	onOpenChange,
	pending,
	onConfirm,
}: EndMeetingDialogProps) {
	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!pending) onOpenChange(next);
			}}
		>
			<AlertDialogContent className="gap-5 rounded-lg bg-bg-1 p-5 sm:max-w-md">
				<AlertDialogHeader className="gap-2">
					<AlertDialogTitle className="font-semibold text-base">
						Encerrar a reunião?
					</AlertDialogTitle>
					<AlertDialogDescription className="text-fg-2 text-sm">
						Depois de encerrada, a reunião não reabre: ninguém mais entra e
						nenhum KPI é dado por ela. O que já foi atribuído continua valendo.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>
						Continuar reunião
					</AlertDialogCancel>
					<Button type="button" disabled={pending} onClick={onConfirm}>
						{pending ? <Spinner data-icon="inline-start" /> : null}
						Encerrar
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
