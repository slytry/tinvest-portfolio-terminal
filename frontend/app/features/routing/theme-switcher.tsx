import { SegmentedControl, useMantineColorScheme } from "@mantine/core";

export function ThemeSwitcher() {
	const { colorScheme, setColorScheme } = useMantineColorScheme();

	return (
		<SegmentedControl
			size="xs"
			radius="md"
			value={colorScheme}
			onChange={(value) => setColorScheme(value as "light" | "dark" | "auto")}
			data={[
				{ label: "Светлая", value: "light" },
				{ label: "Тёмная", value: "dark" },
				{ label: "Авто", value: "auto" },
			]}
		/>
	);
}
