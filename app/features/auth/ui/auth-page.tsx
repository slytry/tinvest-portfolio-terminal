import { Button, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { reatomComponent, useWrap } from "@reatom/react";
import { useState } from "react";
import { portfolioRoute } from "~/features/routing/model";

export const AuthPage = reatomComponent(() => {
	const [token, setToken] = useState("");
	const goPortfolio = useWrap(() => portfolioRoute.go(), "goPortfolio");

	function handleLogin() {
		if (!token.trim()) return;
		localStorage.setItem("token", token);
		goPortfolio();
	}

	return (
		<Paper maw={560} mt={100} mx="auto" p="xl" radius="lg" shadow="sm" withBorder>
			<Stack gap="md">
				<Title order={2}>Подключение API</Title>
				<Text size="sm" c="dimmed">
					Введите токен Tinkoff Invest API, чтобы загрузить актуальный портфель.
				</Text>

				<TextInput
					label="API Token"
					placeholder="t.XXXXXXXXXXXXXXXX"
					onChange={(e) => setToken(e.currentTarget.value)}
					value={token}
				/>

				<Button fullWidth mt="sm" onClick={handleLogin} disabled={!token.trim()}>
					Сохранить и открыть портфель
				</Button>
			</Stack>
		</Paper>
	);
}, "AuthPage");
