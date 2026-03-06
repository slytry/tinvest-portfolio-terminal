import type { TTechApiClient } from "@tinkoff/invest-js-grpc-web";

export const allInstruments = async (client: TTechApiClient) => {
	const shares = await client.instruments.shares({});
	const bonds = await client.instruments.bonds({});
	const etfs = await client.instruments.etfs({});
	return { shares, bonds, etfs };
};
