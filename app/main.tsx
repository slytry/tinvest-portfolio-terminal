import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { reatomContext } from "@reatom/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppTheme } from "./app-theme";
import "./app.css";
import { AppRouter } from "./features/routing/app-router";
import { reatomFrame } from "./setup";

const root = document.documentElement;
root.setAttribute("lang", "en");
for (const [key, value] of Object.entries(mantineHtmlProps)) {
	root.setAttribute(key, String(value));
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ColorSchemeScript />
		<reatomContext.Provider value={reatomFrame}>
			<AppTheme>
				<AppRouter />
			</AppTheme>
		</reatomContext.Provider>
	</StrictMode>,
);
