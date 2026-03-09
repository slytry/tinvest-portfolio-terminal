import { Alert, Button, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { reatomComponent, useWrap } from "@reatom/react";
import { useState } from "react";
import { portfolioRoute } from "~/features/routing/model";

export const AuthPage = reatomComponent(() => {
	const [token, setToken] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const goPortfolio = useWrap(() => portfolioRoute.go(), "goPortfolio");

	async function handleLogin() {
		if (!token.trim()) return;
		setIsLoading(true);
		setError("");
		try {
			const response = await fetch("/api/v1/auth/token", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: token.trim() }),
			});
			if (!response.ok) {
				throw new Error(await response.text());
			}
			goPortfolio();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Не удалось сохранить токен");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Paper maw={560} mt={100} mx="auto" p="xl" radius="lg" shadow="sm" withBorder>
			<Stack gap="md">
				<Title order={2}>Подключение API</Title>
				<Text size="sm" c="dimmed">
					Введите токен T-Invest API. Токен хранится в backend-сессии.
				</Text>

				<TextInput
					label="API Token"
					placeholder="t.XXXXXXXXXXXXXXXX"
					onChange={(e) => setToken(e.currentTarget.value)}
					value={token}
				/>

				{error && <Alert color="red">{error}</Alert>}

				<Button
					fullWidth
					mt="sm"
					onClick={handleLogin}
					disabled={!token.trim()}
					loading={isLoading}
				>
					Сохранить и открыть портфель
				</Button>
			</Stack>
		</Paper>
	);
}, "AuthPage");
