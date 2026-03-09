import {
	Alert,
	AppShell,
	Button,
	Container,
	Group,
	Paper,
	Stack,
	Text,
	Title,
	useComputedColorScheme,
} from "@mantine/core";
import { is404 } from "@reatom/core";
import { reatomComponent, useWrap } from "@reatom/react";
import { useEffect } from "react";
import { AuthPage } from "~/features/auth/ui/auth-page";
import { HistoryPage } from "~/features/history/ui/history-page";
import { PortfolioPage } from "~/features/portfolio/ui/portfolio-page";
import { ThemeSwitcher } from "./theme-switcher";
import { authRoute, historyRoute, initRouting, portfolioRoute } from "./model";

export const AppRouter = reatomComponent(() => {
	const colorScheme = useComputedColorScheme("light");
	const isDark = colorScheme === "dark";
	const isAuthRoute = authRoute.exact();
	const isHistoryRoute = historyRoute.exact();
	const isPortfolioRoute = portfolioRoute.exact();
	const isNotFound = is404();
	const runInitRouting = useWrap(initRouting, "runInitRouting");
	const goPortfolio = useWrap(() => portfolioRoute.go(), "goPortfolio");
	const goHistory = useWrap(() => historyRoute.go(), "goHistory");
	const goAuth = useWrap(() => authRoute.go(), "goAuth");

	useEffect(() => {
		runInitRouting();
	}, [runInitRouting]);

	let content: React.ReactNode = null;

	if (isAuthRoute) {
		content = <AuthPage />;
	}

	if (!content && isPortfolioRoute) {
		content = <PortfolioPage />;
	}
	if (!content && isHistoryRoute) {
		content = <HistoryPage />;
	}

	if (!content && isNotFound) {
		content = (
			<Container mt="xl">
				<Stack>
					<Title order={2}>Page not found</Title>
					<Alert color="red">No route matched the current URL.</Alert>
				</Stack>
			</Container>
		);
	}

	return (
		<AppShell
			header={{ height: 72 }}
			padding="lg"
		>
			<AppShell.Header>
				<Group
					className="app-shell-header"
					justify="space-between"
					h="100%"
					px="lg"
					style={{
						background: isDark
							? "linear-gradient(90deg, rgba(2,6,23,0.95), rgba(30,41,59,0.95))"
							: "linear-gradient(90deg, rgba(15,23,42,0.96), rgba(51,65,85,0.92))",
						color: "white",
						borderBottom: "1px solid rgba(148,163,184,0.25)",
					}}
				>
					<Stack gap={0}>
						<Title order={4} c="white">
							TInvest Portfolio Terminal
						</Title>
						<Text size="xs" c="gray.3">
							Portfolio analytics workspace
						</Text>
					</Stack>
					<Group gap="xs">
						<ThemeSwitcher />
						<Button
							variant={isDark ? "default" : "light"}
							color={isDark ? "dark" : "gray"}
							size="xs"
							onClick={goPortfolio}
						>
							Портфель
						</Button>
						<Button
							variant={isDark ? "default" : "light"}
							color={isDark ? "dark" : "gray"}
							size="xs"
							onClick={goHistory}
						>
							История
						</Button>
						<Button
							variant={isDark ? "default" : "light"}
							color={isDark ? "dark" : "gray"}
							size="xs"
							onClick={goAuth}
						>
							Токен
						</Button>
					</Group>
				</Group>
			</AppShell.Header>

			<AppShell.Main>
				<Container size="xl">
					<Paper
						className="app-card"
						radius="xl"
						p="md"
						withBorder
						style={{
							backdropFilter: "blur(6px)",
						}}
					>
						{content}
					</Paper>
				</Container>
			</AppShell.Main>
		</AppShell>
	);
}, "AppRouter");
