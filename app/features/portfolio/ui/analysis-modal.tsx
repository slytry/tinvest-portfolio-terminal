import {
	Button,
	CopyButton,
	Flex,
	Modal,
	Select,
	Stack,
	Text,
	Textarea,
} from "@mantine/core";
import {
	buildAnalysisPrompt,
	type ExportRow,
} from "~/features/portfolio/lib/export";
import { PROMPT_TEMPLATES } from "~/features/portfolio/model/prompt-templates";

type Props = {
	opened: boolean;
	onClose: () => void;
	selectedPromptTemplate: string;
	onPromptTemplateChange: (value: string) => void;
	rows: ExportRow[];
};

export function AnalysisModal({
	opened,
	onClose,
	selectedPromptTemplate,
	onPromptTemplateChange,
	rows,
}: Props) {
	const template =
		PROMPT_TEMPLATES.find((t) => t.key === selectedPromptTemplate) ||
		PROMPT_TEMPLATES[0];
	const prompt = buildAnalysisPrompt(template, rows);

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title="Промпт для анализа портфеля"
			size="xl"
		>
			<Stack>
				<Select
					label="Шаблон промпта"
					data={PROMPT_TEMPLATES.map((item) => ({
						value: item.key,
						label: item.label,
					}))}
					value={selectedPromptTemplate}
					onChange={(value) =>
						onPromptTemplateChange(value || PROMPT_TEMPLATES[0].key)
					}
				/>

				<Textarea
					label="Готовый промпт"
					minRows={18}
					autosize
					value={prompt}
					readOnly
				/>

				<Flex justify="space-between" align="center">
					<Text size="xs" c="dimmed">
						В промпт подставлен текущий выбранный портфель.
					</Text>

					<CopyButton value={prompt} timeout={1200}>
						{({ copied, copy }) => (
							<Button size="sm" onClick={copy}>
								{copied ? "Скопировано" : "Копировать промпт"}
							</Button>
						)}
					</CopyButton>
				</Flex>
			</Stack>
		</Modal>
	);
}
