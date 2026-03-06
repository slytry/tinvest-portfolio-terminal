import { Button, Paper, TextInput, Title } from "@mantine/core";
import { useState } from "react";
import { useNavigate } from "react-router";

export default function AuthPage() {
	const [token, setToken] = useState("");
	const navigate = useNavigate();

	function handleLogin() {
		localStorage.setItem("token", token);
		navigate("/");
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
}
