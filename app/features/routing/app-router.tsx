import {
	Alert,
	AppShell,
	Button,
	Container,
	Group,
	Stack,
	Title,
} from "@mantine/core";
import { is404 } from "@reatom/core";
import { reatomComponent, useWrap } from "@reatom/react";
import { useEffect } from "react";
import { AuthPage } from "~/features/auth/ui/auth-page";
import { PortfolioPage } from "~/features/portfolio/ui/portfolio-page";
import { authRoute, initRouting, portfolioRoute } from "./model";

export const AppRouter = reatomComponent(() => {
	const isAuthRoute = authRoute.exact();
	const isPortfolioRoute = portfolioRoute.exact();
	const isNotFound = is404();
	const runInitRouting = useWrap(initRouting, "runInitRouting");
	const goPortfolio = useWrap(() => portfolioRoute.go(), "goPortfolio");
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
			header={{ height: 60 }}
			padding="md"
		>
			<AppShell.Header>
				<Group justify="space-between" h="100%" px="md">
					<Title order={4}>TInvest Portfolio Terminal</Title>
					<Group gap="xs">
						<Button variant="subtle" size="xs" onClick={goPortfolio}>
							Портфель
						</Button>
						<Button variant="subtle" size="xs" onClick={goAuth}>
							Токен
						</Button>
					</Group>
				</Group>
			</AppShell.Header>

			<AppShell.Main>{content}</AppShell.Main>
		</AppShell>
	);
}, "AppRouter");
