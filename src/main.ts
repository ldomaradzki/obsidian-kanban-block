import { Plugin, MarkdownPostProcessorContext, MarkdownView } from 'obsidian';
import { parseTodoBlock } from './parser';
import { KanbanBoard } from './kanban';
import { KanbanBlockSettings, DEFAULT_SETTINGS, KanbanBlockSettingTab } from './settings';

export default class KanbanBlockPlugin extends Plugin {
	settings: KanbanBlockSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new KanbanBlockSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor('todo', (source, el, ctx) => {
			this.processKanbanBlock(source, el, ctx);
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private processKanbanBlock(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): void {
		const { items, ignoredLines } = parseTodoBlock(source);

		// Check if we can get an editor for this file - if not, we're in reading mode
		let readOnly = true;
		const leaves = this.app.workspace.getLeavesOfType('markdown');
		for (const leaf of leaves) {
			const view = leaf.view as MarkdownView;
			if (view.file?.path === ctx.sourcePath) {
				// Found the view with this file
				const mode = view.getMode();
				readOnly = mode === 'preview';
				break;
			}
		}

		new KanbanBoard(el, items, ignoredLines, (newMarkdown) => {
			this.updateSource(ctx, source, newMarkdown);
		}, this.app, this, ctx.sourcePath, this.settings.columnNames, this.settings.centerBoard, readOnly);
	}

	private updateSource(
		ctx: MarkdownPostProcessorContext,
		oldSource: string,
		newSource: string
	): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const editor = view.editor;
		if (!editor) return;

		const content = editor.getValue();

		// Find the code block and replace its content
		const codeBlockRegex = /```todo\n([\s\S]*?)```/g;
		let match;

		while ((match = codeBlockRegex.exec(content)) !== null) {
			const blockContent = match[1];

			// Normalize for comparison (trim trailing newline)
			if (blockContent?.trim() === oldSource.trim()) {
				const start = editor.offsetToPos(match.index + '```todo\n'.length);
				const end = editor.offsetToPos(match.index + '```todo\n'.length + (blockContent?.length ?? 0));

				// Preserve trailing newline if original had one
				const replacement = blockContent?.endsWith('\n') ? newSource + '\n' : newSource;
				editor.replaceRange(replacement, start, end);
				break;
			}
		}
	}
}
