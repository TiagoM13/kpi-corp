import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export function useMemberStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		...orpc.members.setStatus.mutationOptions(),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: orpc.members.key() }),
	});
}
