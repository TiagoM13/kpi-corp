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
import { toast } from "sonner";
import { type MemberListItem, memberStatusErrorOf } from "@/lib/members";
import { useMemberStatus } from "../use-member-status";

const COPY = {
	deactivate: {
		title: (name: string) => `Desativar ${name}?`,
		description: (name: string) =>
			`${name} perde o acesso na hora: as sessões abertas são encerradas e o nome sai do ranking. O histórico de KPIs fica guardado.`,
		confirm: "Desativar",
		success: (name: string) => `${name} foi desativado(a)`,
	},
	activate: {
		title: (name: string) => `Reativar ${name}?`,
		description: (name: string) =>
			`${name} volta a entrar com o mesmo e-mail e senha e reaparece no ranking com os pontos que já tinha.`,
		confirm: "Reativar",
		success: (name: string) => `${name} foi reativado(a)`,
	},
} as const;

type MemberStatusDialogProps = {
	member: MemberListItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function MemberStatusDialog({
	member,
	open,
	onOpenChange,
}: MemberStatusDialogProps) {
	const setStatus = useMemberStatus();

	if (!member) return null;

	const copy = member.active ? COPY.deactivate : COPY.activate;

	const confirm = () => {
		setStatus.mutate(
			{ id: member.id, active: !member.active },
			{
				onSuccess: () => {
					toast.success(copy.success(member.name));
					onOpenChange(false);
				},
				onError: (error) => toast.error(memberStatusErrorOf(error)),
			},
		);
	};

	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!setStatus.isPending) onOpenChange(next);
			}}
		>
			<AlertDialogContent className="gap-5 rounded-lg bg-bg-1 p-5 sm:max-w-md">
				<AlertDialogHeader className="gap-2">
					<AlertDialogTitle className="font-semibold text-base">
						{copy.title(member.name)}
					</AlertDialogTitle>
					<AlertDialogDescription className="text-fg-2 text-sm">
						{copy.description(member.name)}
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={setStatus.isPending}>
						Cancelar
					</AlertDialogCancel>
					<Button
						type="button"
						variant={member.active ? "destructive" : "default"}
						disabled={setStatus.isPending}
						onClick={confirm}
					>
						{setStatus.isPending ? <Spinner data-icon="inline-start" /> : null}
						{copy.confirm}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
