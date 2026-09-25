import { ORPCError } from "@orpc/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	createRefresher,
	createSessionInterceptor,
	isExpiredAccessError,
} from "@/lib/refresh";
import { readStoredSession, writeStoredSession } from "@/lib/session-store";

const USER = {
	id: "b29f5637-0ab1-4de0-b2d2-d364e3903124",
	name: "Admin",
	email: "admin@kpicorp.com",
	role: "ADMIN" as const,
	position: null,
};

function storeSession(accessToken: string, refreshToken: string) {
	writeStoredSession({
		accessToken,
		refreshToken,
		user: {
			userId: USER.id,
			name: USER.name,
			email: USER.email,
			role: USER.role,
			position: USER.position,
		},
	});
}

const expired = () => new ORPCError("UNAUTHORIZED");

beforeEach(() => {
	localStorage.clear();
});

describe("isExpiredAccessError", () => {
	it("reconhece UNAUTHORIZED sem data.code como token vencido", () => {
		expect(isExpiredAccessError(expired())).toBe(true);
	});

	it("nao confunde erro de dominio com token vencido", () => {
		expect(
			isExpiredAccessError(
				new ORPCError("UNAUTHORIZED", {
					data: { code: "INVALID_REFRESH_TOKEN" },
				}),
			),
		).toBe(false);
		expect(isExpiredAccessError(new ORPCError("FORBIDDEN"))).toBe(false);
		expect(isExpiredAccessError(new TypeError("offline"))).toBe(false);
	});
});

describe("refreshOnce", () => {
	it("rotaciona e grava o par novo", async () => {
		storeSession("access-1", "refresh-1");
		const refresh = vi.fn().mockResolvedValue({
			accessToken: "access-2",
			refreshToken: "refresh-2",
			user: USER,
		});

		expect(await createRefresher(refresh)()).toBe("access-2");
		expect(refresh).toHaveBeenCalledWith("refresh-1");
		expect(readStoredSession()?.refreshToken).toBe("refresh-2");
	});

	it("deduplica refreshes simultaneos numa rotacao so", async () => {
		storeSession("access-1", "refresh-1");
		const refresh = vi.fn().mockResolvedValue({
			accessToken: "access-2",
			refreshToken: "refresh-2",
			user: USER,
		});
		const refreshOnce = createRefresher(refresh);

		const tokens = await Promise.all([refreshOnce(), refreshOnce()]);

		expect(tokens).toEqual(["access-2", "access-2"]);
		expect(refresh).toHaveBeenCalledTimes(1);
	});

	it("limpa a sessao quando o servidor recusa o refresh", async () => {
		storeSession("access-1", "refresh-1");
		const refresh = vi.fn().mockRejectedValue(
			new ORPCError("UNAUTHORIZED", {
				data: { code: "INVALID_REFRESH_TOKEN" },
			}),
		);

		expect(await createRefresher(refresh)()).toBeNull();
		expect(readStoredSession()).toBeNull();
	});

	it("mantem a sessao quando a rede cai no meio do refresh", async () => {
		storeSession("access-1", "refresh-1");
		const refresh = vi.fn().mockRejectedValue(new TypeError("offline"));

		await expect(createRefresher(refresh)()).rejects.toThrow("offline");
		expect(readStoredSession()?.refreshToken).toBe("refresh-1");
	});

	it("nao chama o servidor sem sessao", async () => {
		const refresh = vi.fn();

		expect(await createRefresher(refresh)()).toBeNull();
		expect(refresh).not.toHaveBeenCalled();
	});
});

describe("createSessionInterceptor", () => {
	it("renova e repete a request uma vez, transparente para a tela", async () => {
		storeSession("access-1", "refresh-1");
		const refreshOnce = vi.fn(async () => {
			storeSession("access-2", "refresh-2");
			return "access-2";
		});
		const next = vi
			.fn()
			.mockRejectedValueOnce(expired())
			.mockResolvedValueOnce("dados");

		const result = await createSessionInterceptor(refreshOnce)({ next });

		expect(result).toBe("dados");
		expect(next).toHaveBeenCalledTimes(2);
		expect(refreshOnce).toHaveBeenCalledTimes(1);
	});

	it("nao renova de novo se outra request ja trocou o token", async () => {
		storeSession("access-1", "refresh-1");
		const refreshOnce = vi.fn();
		const next = vi
			.fn()
			.mockImplementationOnce(async () => {
				storeSession("access-2", "refresh-2");
				throw expired();
			})
			.mockResolvedValueOnce("dados");

		expect(await createSessionInterceptor(refreshOnce)({ next })).toBe("dados");
		expect(refreshOnce).not.toHaveBeenCalled();
	});

	it("desiste e limpa a sessao quando o refresh morre", async () => {
		storeSession("access-1", "refresh-1");
		const error = expired();
		const next = vi.fn().mockRejectedValue(error);

		await expect(
			createSessionInterceptor(async () => null)({ next }),
		).rejects.toBe(error);
		expect(next).toHaveBeenCalledTimes(1);
		expect(readStoredSession()).toBeNull();
	});

	it("nao tenta renovar request anonima", async () => {
		const refreshOnce = vi.fn();
		const next = vi.fn().mockRejectedValue(expired());

		await expect(
			createSessionInterceptor(refreshOnce)({ next }),
		).rejects.toBeInstanceOf(ORPCError);
		expect(refreshOnce).not.toHaveBeenCalled();
	});

	it("repassa erro de dominio sem renovar", async () => {
		storeSession("access-1", "refresh-1");
		const refreshOnce = vi.fn();
		const error = new ORPCError("FORBIDDEN", {
			data: { code: "ACCOUNT_DEACTIVATED" },
		});

		await expect(
			createSessionInterceptor(refreshOnce)({
				next: vi.fn().mockRejectedValue(error),
			}),
		).rejects.toBe(error);
		expect(refreshOnce).not.toHaveBeenCalled();
	});
});
