import { ProfileSheet } from "@/components/member-profile/profile-sheet";
import type { MemberListItem } from "@/lib/members";
import { MemberProfile } from "./member-profile";

type MemberProfileDrawerProps = {
	member: MemberListItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function MemberProfileDrawer({
	member,
	open,
	onOpenChange,
}: MemberProfileDrawerProps) {
	return (
		<ProfileSheet open={open} onOpenChange={onOpenChange}>
			{member && <MemberProfile member={member} />}
		</ProfileSheet>
	);
}
