import { TTechApiClient } from "@tinkoff/invest-js-grpc-web";

function createApi(token: string) {
	const client = new TTechApiClient({
		token: token,
		metadata: { "x-app-name": "nanaumov" },
	});

	return client;
}

export const api = createApi(localStorage.getItem("token") || "");
