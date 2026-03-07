import { Button, Paper, TextInput, Title } from "@mantine/core";
import { reatomComponent, useWrap } from "@reatom/react";
import { useState } from "react";
import { portfolioRoute } from "~/features/routing/model";

export const AuthPage = reatomComponent(() => {
	const [token, setToken] = useState("");
	const goPortfolio = useWrap(() => portfolioRoute.go(), "goPortfolio");

	function handleLogin() {
		localStorage.setItem("token", token);
		goPortfolio();
	}

	return (
		<Paper maw={400} mt={100} mx="auto" p="xl" shadow="md">
			<Title mb="md" order={2}>
				Авторизация
			</Title>

			<TextInput
				label="API Token"
				onChange={(e) => setToken(e.currentTarget.value)}
				value={token}
			/>

			<Button fullWidth mt="md" onClick={handleLogin}>
				Войти
			</Button>
		</Paper>
	);
}, "AuthPage");
