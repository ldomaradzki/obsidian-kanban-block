import { Plugin, MarkdownPostProcessorContext, MarkdownView } from 'obsidian';
import { parseTodoBlock } from './parser';
import { KanbanBoard } from './kanban';
import { PluginSettings, DEFAULT_SETTINGS } from 'settings/Settings';
import { KanbanSettingTab } from 'settings/KanbanSettingTab';

export default class KanbanBlockPlugin extends Plugin {
	settings: PluginSettings;
	
	async onload() {
		await this.loadSettings();
		this.addSettingTab(new KanbanSettingTab(this.app, this));
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
		const items = parseTodoBlock(source);

		if (items.length === 0) {
			el.createDiv({ text: 'No todo items found', cls: 'kanban-empty' });
			return;
		}

		new KanbanBoard(el, items, (newMarkdown) => {
			this.updateSource(ctx, source, newMarkdown);
		}, this.app, this, ctx.sourcePath, this);
	}

	private updateSource(
		ctx: MarkdownPostProcessorContext,
		oldSource: string,
		newSource: string
	): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const editor = view.editor;
		const content = editor.getValue();

		// Find the code block and replace its content
		const codeBlockRegex = /```todo\n([\s\S]*?)```/g;
		let match;
		let found = false;

		while ((match = codeBlockRegex.exec(content)) !== null) {
			const blockContent = match[1];
			// Normalize for comparison (trim trailing newline)
			if (blockContent?.trim() === oldSource.trim()) {
				const start = editor.offsetToPos(match.index + '```todo\n'.length);
				const end = editor.offsetToPos(match.index + '```todo\n'.length + (blockContent?.length ?? 0));

				// Preserve trailing newline if original had one
				const replacement = blockContent?.endsWith('\n') ? newSource + '\n' : newSource;
				editor.replaceRange(replacement, start, end);
				found = true;
				break;
			}
		}

		if (!found) {
			console.warn('KanbanBlock: Could not find matching code block to update');
		}
	}
}
