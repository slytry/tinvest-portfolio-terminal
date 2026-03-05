import { Button, Paper, TextInput, Title } from "@mantine/core";
import { useState } from "react";
import { useNavigate } from "react-router";
import { setToken } from "../../shared/auth";

export function AuthPage() {
  const [token, setTokenValue] = useState("");
  const navigate = useNavigate();

  function handleLogin() {
    setToken(token);
    navigate("/portfolio");
  }

  return (
    <Paper maw={400} mt={100} mx="auto" p="xl" shadow="md">
      <Title mb="md" order={2}>
        Авторизация
      </Title>

      <TextInput
        label="API Token"
        onChange={(e) => setTokenValue(e.currentTarget.value)}
        value={token}
      />

      <Button fullWidth mt="md" onClick={handleLogin}>
        Войти
      </Button>
    </Paper>
  );
}
