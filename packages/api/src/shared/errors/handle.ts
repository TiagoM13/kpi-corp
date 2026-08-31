import { mapDomainErrorToORPCError } from "./error-mapper";

/**
 * Runs a service call at the transport boundary, translating domain failures
 * into oRPC errors. Every router handler should go through it so no module has
 * to know about oRPC.
 */
export async function handle<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		throw mapDomainErrorToORPCError(error);
	}
}
