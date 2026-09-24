export const emptyAsUndefined = (value: unknown) =>
	typeof value === "string" && value.trim() === "" ? undefined : value;

export const booleanFromQuery = (value: unknown) => {
	if (typeof value !== "string") {
		return value;
	}

	const normalized = value.trim().toLowerCase();

	if (normalized === "") {
		return undefined;
	}

	if (normalized === "true") {
		return true;
	}

	if (normalized === "false") {
		return false;
	}

	return normalized;
};
