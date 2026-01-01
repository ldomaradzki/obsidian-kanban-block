import { Plugin, MarkdownPostProcessorContext, MarkdownView } from 'obsidian';
import { parseTodoBlock } from './parser';
import { KanbanBoard } from './kanban';

export default class KanbanBlockPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor('todo', (source, el, ctx) => {
			this.processKanbanBlock(source, el, ctx);
		});
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
		}, this.app, this, ctx.sourcePath);
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
