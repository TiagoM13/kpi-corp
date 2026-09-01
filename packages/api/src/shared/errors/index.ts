export {
	EmailAlreadyRegisteredError,
	UnauthorizedError,
} from "./common.errors";
export { DomainError, type DomainErrorStatus } from "./domain-error";
export { mapDomainErrorToORPCError } from "./error-mapper";
export { handle } from "./handle";
