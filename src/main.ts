import { Plugin, MarkdownPostProcessorContext, MarkdownView, Editor, Menu, TFile } from 'obsidian';
import { parseTodoBlock } from './parser';
import { KanbanBoard } from './kanban';
import { KanbanBlockSettings, DEFAULT_SETTINGS, KanbanBlockSettingTab } from './settings';
import { t } from './i18n';

export default class KanbanBlockPlugin extends Plugin {
	settings: KanbanBlockSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new KanbanBlockSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor('todo', (source, el, ctx) => {
			this.processKanbanBlock(source, el, ctx);
		});

		// Add command to insert Kanban
		this.addCommand({
			id: 'insert-kanban',
			name: t('command_insert_kanban', this.settings.language),
			editorCallback: (editor: Editor) => {
				editor.replaceSelection("```todo\n- [ ] \n```");
			}
		});

		// Add to context menu
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
				menu.addItem((item) => {
					item
						.setTitle(t('menu_insert_kanban', this.settings.language))
						.setIcon("zap")
						.setSection("insert")
						.onClick(() => {
							editor.replaceSelection("```todo\n- [ ] \n```");
						});
				});
			})
		);
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

		new KanbanBoard(el, items, ignoredLines, async (newMarkdown: string, oldMarkdown: string) => {
			await this.updateSource(ctx, el, newMarkdown, oldMarkdown);
		}, this.app, this, ctx.sourcePath, this.settings.columnNames, this.settings.centerBoard, this.settings.language, this.settings.deleteDelay);
	}

	private async updateSource(
		ctx: MarkdownPostProcessorContext,
		el: HTMLElement,
		newSource: string,
		oldSource: string
	): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!(file instanceof TFile)) return;

		const sectionInfo = ctx.getSectionInfo(el);

		// Try to use the editor if available for a better user experience (undo/redo)
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const editor = view?.getMode() === 'source' ? view.editor : null;

		if (editor && sectionInfo && view) {
			// Save scroll position before making changes
			const scrollContainer = view.contentEl.querySelector('.cm-scroller') as HTMLElement | null;
			const scrollTop = scrollContainer?.scrollTop ?? 0;

			const startLine = sectionInfo.lineStart + 1;
			const endLine = sectionInfo.lineEnd - 1;
			editor.replaceRange(newSource.endsWith('\n') ? newSource : newSource + '\n',
				{ line: startLine, ch: 0 },
				{ line: endLine + 1, ch: 0 }
			);

			// Restore scroll position after change
			if (scrollContainer) {
				requestAnimationFrame(() => {
					scrollContainer.scrollTop = scrollTop;
				});
			}
			return;
		}

		// Fallback to Vault API for Reading Mode or if getSectionInfo fails
		await this.app.vault.process(file, (data) => {
			const lines = data.split('\n');

			if (sectionInfo) {
				const startLine = sectionInfo.lineStart + 1;
				const endLine = sectionInfo.lineEnd - 1;
				lines.splice(startLine, endLine - startLine + 1, newSource.trim());
				return lines.join('\n');
			}

			// Ultimate fallback: find by content
			const content = lines.join('\n');
			const blockRegex = new RegExp('```todo\\n' + this.escapeRegExp(oldSource.trim()) + '\\s*\\n```', 'g');
			const replacement = '```todo\n' + newSource.trim() + '\n```';
			return content.replace(blockRegex, replacement);
		});
	}

	private escapeRegExp(string: string) {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
}
