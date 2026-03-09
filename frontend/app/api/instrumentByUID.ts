import { InstrumentIdType } from "@tinkoff/invest-js-grpc-web";
import { api } from "./client";

const instrumentMemoryCache = new Map<string, unknown>();

const LS_KEY = "instrumentCache";

const persistedCache: Record<string, unknown> = (() => {
	if (typeof window === "undefined") return {};

	try {
		const raw = localStorage.getItem(LS_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
})();

export async function cachedRequest<T>(
	key: string,
	fetcher: () => Promise<T>,
): Promise<T> {
	if (instrumentMemoryCache.has(key)) {
		return instrumentMemoryCache.get(key) as T;
	}

	if (persistedCache[key]) {
		const cached = persistedCache[key] as T;
		instrumentMemoryCache.set(key, cached);
		return cached;
	}

	const res = await fetcher();

	instrumentMemoryCache.set(key, res);

	if (typeof window !== "undefined") {
		persistedCache[key] = res;

		try {
			localStorage.setItem(LS_KEY, JSON.stringify(persistedCache));
		} catch {
			// ignore localStorage overflow
		}
	}

	return res;
}

export async function instrumentByUID(uuid: string) {
	return cachedRequest(uuid, async () => {
		return api.instruments.getInstrumentBy({
			idType: InstrumentIdType.INSTRUMENT_ID_TYPE_UID,
			id: uuid,
		});
	});
}
