import { Button } from "@kpi-corp/ui/components/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetTitle,
} from "@kpi-corp/ui/components/sheet";
import { XIcon } from "lucide-react";
import { OverlayHeader } from "@/components/overlay-header";
import type { Member } from "@/mocks/members";
import { MemberDetail } from "./member-detail";

export { MemberDetail } from "./member-detail";

type MemberDetailDrawerProps = {
	member: Member | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function MemberDetailDrawer({
	member,
	open,
	onOpenChange,
}: MemberDetailDrawerProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				showCloseButton={false}
				className="gap-0 bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-3xl"
			>
				<OverlayHeader
					close={
						<SheetClose
							render={
								<Button
									type="button"
									variant="outline"
									size="icon"
									aria-label="Fechar perfil"
								/>
							}
						>
							<XIcon />
						</SheetClose>
					}
				>
					<SheetTitle className="font-medium text-2xs text-fg-3 uppercase tracking-widest">
						Perfil do membro
					</SheetTitle>
				</OverlayHeader>

				<div className="flex-1 overflow-y-auto px-4 pt-6 pb-14 sm:px-8 sm:pt-8">
					{member && <MemberDetail member={member} />}
				</div>
			</SheetContent>
		</Sheet>
	);
}
