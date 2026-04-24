import { App, Component, MarkdownRenderer } from 'obsidian';
import { TodoItem, TodoState, KanbanColumn } from './types';
import { itemsToMarkdown } from './parser';
import { KanbanSuggest } from './suggest';
import { ColumnConfig, ColumnStyle } from './settings';
import { Language, tp } from './i18n';

const COLLAPSED_COLUMN_MIN_HEIGHT = 180;

export class KanbanBoard {
	private container: HTMLElement;
	private items: TodoItem[];
	private ignoredLines: string[];
	private onUpdate: (newMarkdown: string, oldMarkdown: string) => void | Promise<void>;
	private app: App;
	private component: Component;
	private sourcePath: string;
	private columns: ColumnConfig[];
	private centerBoard: boolean;
	private language: Language;
	private deleteDelay: number;
	private unmatchedCount: number;
	private draggedItem: TodoItem | null = null;
	private draggedElement: HTMLElement | null = null;
	private lastMarkdown: string;
	private dragOutsideStartTime: number | null = null;

	constructor(
		container: HTMLElement,
		items: TodoItem[],
		ignoredLines: string[],
		onUpdate: (newMarkdown: string, oldMarkdown: string) => void | Promise<void>,
		app: App,
		component: Component,
		sourcePath: string,
		columns: ColumnConfig[],
		centerBoard: boolean,
		language: Language,
		deleteDelay: number,
		unmatchedCount: number
	) {
		this.container = container;
		this.items = items;
		this.ignoredLines = ignoredLines;
		this.onUpdate = onUpdate;
		this.app = app;
		this.component = component;
		this.sourcePath = sourcePath;
		this.columns = columns;
		this.centerBoard = centerBoard;
		this.language = language;
		this.deleteDelay = deleteDelay;
		this.unmatchedCount = unmatchedCount;
		this.lastMarkdown = itemsToMarkdown(this.items, this.columns, this.ignoredLines);

		this.render();
		this.setupBoardEvents();
	}

	private setupBoardEvents(): void {
		// Track when dragging outside the board for visual feedback
		const handleDocumentDragOver = (e: DragEvent) => {
			if (!this.draggedElement) return;

			// Get board bounds
			const board = this.container.querySelector('.kanban-board');
			if (!board) return;

			const boardRect = board.getBoundingClientRect();
			const isOutside =
				e.clientX < boardRect.left ||
				e.clientX > boardRect.right ||
				e.clientY < boardRect.top ||
				e.clientY > boardRect.bottom;

			// Add/remove delete zone class for visual feedback
			if (isOutside) {
				this.draggedElement.addClass('kanban-card-delete-zone');
			} else {
				this.draggedElement.removeClass('kanban-card-delete-zone');
			}
		};

		document.addEventListener('dragover', handleDocumentDragOver);

		const handleWindowResize = () => {
			this.applyCollapsedColumnLayout();
		};
		window.addEventListener('resize', handleWindowResize);

		// Clean up listener when component unloads
		this.component.register(() => {
			document.removeEventListener('dragover', handleDocumentDragOver);
			window.removeEventListener('resize', handleWindowResize);
		});
	}

	private async triggerUpdate(): Promise<void> {
		const newMarkdown = itemsToMarkdown(this.items, this.columns, this.ignoredLines);
		if (newMarkdown !== this.lastMarkdown) {
			await this.onUpdate(newMarkdown, this.lastMarkdown);
			this.lastMarkdown = newMarkdown;
		}
	}

	private getColumns(): KanbanColumn[] {
		return this.columns.map(col => ({
			state: col.id,
			title: col.name,
			...col,
			items: this.items.filter(item => item.state === col.id),
		}));
	}

	private getColumnByState(state: TodoState): ColumnConfig | undefined {
		return this.columns.find(column => column.id === state);
	}

	private getStyleByState(state: TodoState): ColumnStyle {
		return this.getColumnByState(state)?.style ?? 'none';
	}

	private shouldFadeByStyle(style: ColumnStyle): boolean {
		return style === 'fade' || style === 'delete-line';
	}

	private formatTextForState(text: string, state: TodoState): string {
		return this.getStyleByState(state) === 'delete-line'
			? this.applyDeleteLine(text)
			: text;
	}

	private applyDeleteLine(text: string): string {
		const trimmed = text.trim();
		if (trimmed.length === 0) return text;
		if (/^~~\((.*)\)~~$/.test(trimmed)) return trimmed;
		return `~~(${trimmed})~~`;
	}

	private removeDeleteLine(text: string): string {
		const trimmed = text.trim();
		const match = trimmed.match(/^~~\((.*)\)~~$/);
		if (!match) return text;
		return match[1] ?? '';
	}

	private render(): void {
		this.container.empty();
		this.container.addClass('kanban-wrapper');

		if (this.ignoredLines.length > 0) {
			this.container.createDiv({
				cls: 'kanban-warning',
				text: '⚠ Some lines are not checkboxes and may be lost on edit.'
			});
		}

		if (this.unmatchedCount > 0) {
			this.container.createDiv({
				cls: 'kanban-warning',
				text: `⚠ ${tp('board_unmatched_notice', this.language, { count: String(this.unmatchedCount) })}`
			});
		}

		const boardClasses = this.centerBoard ? 'kanban-board kanban-board-centered' : 'kanban-board';
		const board = this.container.createDiv({ cls: boardClasses });
		const columns = this.getColumns();
		for (const column of columns) {
			this.renderColumn(board, column);
		}

		requestAnimationFrame(() => {
			this.applyCollapsedColumnLayout();
		});
	}

	private applyCollapsedColumnLayout(): void {
		const board = this.container.querySelector<HTMLElement>('.kanban-board');
		if (!board) return;

		const collapsedColumns = Array.from(board.querySelectorAll<HTMLElement>('.kanban-column-collapsed'));
		if (collapsedColumns.length === 0) return;

		const baseColumns = Array.from(board.querySelectorAll<HTMLElement>('.kanban-column:not(.kanban-column-collapsed)'));
		let referenceHeight = 0;
		for (const column of baseColumns) {
			referenceHeight = Math.max(referenceHeight, Math.ceil(this.getColumnNaturalHeight(column)));
		}

		const targetHeight = Math.max(referenceHeight, COLLAPSED_COLUMN_MIN_HEIGHT);

		for (const column of collapsedColumns) {
			const nonItemsHeight = this.getColumnNonItemsHeight(column);
			column.style.height = `${targetHeight}px`;
			column.style.minHeight = `${targetHeight}px`;
			column.style.maxHeight = `${targetHeight}px`;
			column.style.overflow = 'hidden';
			column.style.alignSelf = 'flex-start';

			const itemsContainer = column.querySelector<HTMLElement>('.kanban-column-items');
			if (itemsContainer) {
				const itemsHeight = Math.max(targetHeight - nonItemsHeight, 0);
				itemsContainer.style.flex = '0 0 auto';
				itemsContainer.style.height = `${itemsHeight}px`;
				itemsContainer.style.maxHeight = `${itemsHeight}px`;
				itemsContainer.style.minHeight = '0';
				itemsContainer.style.overflowY = 'auto';
			}
		}
	}

	private getPx(styleValue: string | null | undefined): number {
		const parsed = Number.parseFloat(styleValue ?? '0');
		return Number.isFinite(parsed) ? parsed : 0;
	}

	private getOuterHeightWithMargin(el: HTMLElement | null): number {
		if (!el) return 0;
		const style = getComputedStyle(el);
		return el.offsetHeight + this.getPx(style.marginTop) + this.getPx(style.marginBottom);
	}

	private getColumnNonItemsHeight(column: HTMLElement): number {
		const columnStyle = getComputedStyle(column);
		const verticalBox = this.getPx(columnStyle.paddingTop)
			+ this.getPx(columnStyle.paddingBottom)
			+ this.getPx(columnStyle.borderTopWidth)
			+ this.getPx(columnStyle.borderBottomWidth);
		const headerHeight = this.getOuterHeightWithMargin(column.querySelector<HTMLElement>('.kanban-column-header'));
		const addBtnHeight = this.getOuterHeightWithMargin(column.querySelector<HTMLElement>('.kanban-add-btn'));
		return verticalBox + headerHeight + addBtnHeight;
	}

	private getItemsNaturalHeight(itemsContainer: HTMLElement): number {
		const style = getComputedStyle(itemsContainer);
		const minHeight = this.getPx(style.minHeight);
		const cards = Array.from(itemsContainer.querySelectorAll<HTMLElement>('.kanban-card'));
		if (cards.length === 0) {
			return minHeight;
		}
		const gap = this.getPx(style.rowGap || style.gap);
		const cardsHeight = cards.reduce((sum, card) => sum + card.offsetHeight, 0);
		return Math.max(minHeight, cardsHeight + gap * Math.max(cards.length - 1, 0));
	}

	private getColumnNaturalHeight(column: HTMLElement): number {
		const nonItemsHeight = this.getColumnNonItemsHeight(column);
		const itemsContainer = column.querySelector<HTMLElement>('.kanban-column-items');
		const itemsNaturalHeight = itemsContainer ? this.getItemsNaturalHeight(itemsContainer) : 0;
		return nonItemsHeight + itemsNaturalHeight;
	}

	private renderColumn(board: HTMLElement, column: KanbanColumn): void {
		const colEl = board.createDiv({ cls: 'kanban-column' });
		if (column.collapse) {
			colEl.addClass('kanban-column-collapsed');
		}
		colEl.dataset['state'] = column.state;

		const header = colEl.createDiv({ cls: 'kanban-column-header' });
		header.createSpan({ text: column.title, cls: 'kanban-column-title' });
		header.createSpan({ text: String(column.items.length), cls: 'kanban-column-count' });

		const itemsContainer = colEl.createDiv({ cls: 'kanban-column-items' });
		if (column.collapse) {
			itemsContainer.addClass('kanban-column-items-collapsed');
		}
		itemsContainer.dataset['state'] = column.state;

		for (const item of column.items) {
			this.renderItem(itemsContainer, item);
		}

		this.setupDropZone(itemsContainer, column.state);

		// Add button
		const addBtn = colEl.createDiv({ cls: 'kanban-add-btn', text: '+' });
		addBtn.addEventListener('click', () => this.addNewItem(column.state));
	}

	private renderItem(container: HTMLElement, item: TodoItem): void {
		const card = container.createDiv({ cls: 'kanban-card' });
		card.dataset['id'] = item.id;
		card.draggable = true;

		const currentStyle = this.getStyleByState(item.state);
		if (this.shouldFadeByStyle(currentStyle)) {
			card.addClass('kanban-card-fade');
		}

		const textEl = card.createDiv({ cls: 'kanban-card-text' });
		void MarkdownRenderer.render(
			this.app,
			item.text,
			textEl,
			this.sourcePath,
			this.component
		);

		if (item.children.length > 0) {
			card.createSpan({
				cls: 'kanban-card-badge',
				text: `+${item.children.length}`
			});
		}

		card.addEventListener('dragstart', (e: DragEvent) => this.handleDragStart(e, item, card));
		card.addEventListener('dragend', (e: DragEvent) => this.handleDragEnd(e));
		card.addEventListener('dblclick', (e: MouseEvent) => {
			e.preventDefault();
			this.startEditing(card, item);
		});

		// Handle clicks on links and tags
		card.addEventListener('click', (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (target.closest('.internal-link') || target.closest('.tag')) {
				// Let Obsidian handle the click
				return;
			}
		});
	}

	private handleDragStart(e: DragEvent, item: TodoItem, el: HTMLElement): void {
		this.draggedItem = item;
		this.draggedElement = el;
		this.dragOutsideStartTime = Date.now(); // Initialize
		el.addClass('kanban-card-dragging');

		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', item.id);
		}
	}

	private handleDragEnd(e: DragEvent): void {
		if (this.draggedElement) {
			this.draggedElement.removeClass('kanban-card-dragging');
			this.draggedElement.removeClass('kanban-card-delete-zone');
		}

		// If dropEffect is 'none', it was dropped outside a valid drop zone
		if (e.dataTransfer?.dropEffect === 'none' && this.draggedItem && this.dragOutsideStartTime) {
			const timeOutside = (Date.now() - this.dragOutsideStartTime) / 1000;
			if (timeOutside >= this.deleteDelay) {
				this.deleteItem(this.draggedItem);
			}
		}

		this.draggedItem = null;
		this.draggedElement = null;
		this.dragOutsideStartTime = null;

		// Remove all drag-over states
		this.container.querySelectorAll('.kanban-drag-over').forEach(el => {
			el.removeClass('kanban-drag-over');
		});
		this.container.querySelectorAll('.kanban-drop-indicator').forEach(el => {
			el.remove();
		});
	}

	private deleteItem(item: TodoItem): void {
		const index = this.items.findIndex(i => i.id === item.id);
		if (index > -1) {
			this.items.splice(index, 1);
			this.render();
			void this.triggerUpdate();
		}
	}

	private setupDropZone(container: HTMLElement, state: TodoState): void {
		container.addEventListener('dragover', (e: DragEvent) => {
			e.preventDefault();
			this.dragOutsideStartTime = Date.now(); // Reset timer while inside
			// Check if it's our own item OR an external drop (files or text)
			const isExternal = e.dataTransfer?.types.includes('Files') || e.dataTransfer?.types.includes('text/plain');
			if (!this.draggedItem && !isExternal) return;

			container.addClass('kanban-drag-over');

			const afterElement = this.getDragAfterElement(container, e.clientY);
			const indicator = this.getOrCreateIndicator(container);

			if (afterElement) {
				afterElement.before(indicator);
			} else {
				container.appendChild(indicator);
			}
		});

		container.addEventListener('dragleave', (e: DragEvent) => {
			const relatedTarget = e.relatedTarget as HTMLElement | null;
			if (!relatedTarget || !container.contains(relatedTarget)) {
				container.removeClass('kanban-drag-over');
				container.querySelector('.kanban-drop-indicator')?.remove();
			}
		});

		container.addEventListener('drop', (e: DragEvent) => {
			e.preventDefault();
			container.removeClass('kanban-drag-over');
			container.querySelector('.kanban-drop-indicator')?.remove();

			const afterElement = this.getDragAfterElement(container, e.clientY);
			const beforeId = afterElement?.dataset['id'];

			if (this.draggedItem) {
				this.moveItem(this.draggedItem, state, beforeId);
			} else {
				// Handle external drop
				const text = e.dataTransfer?.getData('text/plain');
				if (text) {
					const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
					for (const line of lines) {
						let cardText = line;

						// Handle obsidian:// URLs
						if (cardText.startsWith('obsidian://open?')) {
							try {
								const url = new URL(cardText);
								const filePath = url.searchParams.get('file');
								if (filePath) {
									const decodedPath = decodeURIComponent(filePath);
									const parts = decodedPath.split('/');
									let basename = parts[parts.length - 1] || '';
									if (basename.endsWith('.md')) {
										basename = basename.substring(0, basename.length - 3);
									}
									cardText = basename;
								}
							} catch {
								// Fallback to original text
							}
						}

						// If it looks like a path or filename and isn't already a link, make it one
						if (cardText && !cardText.startsWith('[[') && !cardText.endsWith(']]') && !cardText.startsWith('http')) {
							cardText = `[[${cardText}]]`;
						}

						const newItem: TodoItem = {
							id: crypto.randomUUID(),
							text: cardText,
							state: state,
							originalMarker: this.getColumnByState(state)?.marker ?? ' ',
							children: [],
						};

						this.insertItem(newItem, state, beforeId, true);
					}
					this.render();
					void this.triggerUpdate();
				}
			}
		});
	}

	private getOrCreateIndicator(container: HTMLElement): HTMLElement {
		let indicator = container.querySelector<HTMLElement>('.kanban-drop-indicator');
		if (!indicator) {
			indicator = document.createElement('div');
			indicator.className = 'kanban-drop-indicator';
		}
		return indicator;
	}

	private getDragAfterElement(container: HTMLElement, y: number): HTMLElement | null {
		const cards = Array.from(container.querySelectorAll<HTMLElement>('.kanban-card:not(.kanban-card-dragging)'));

		let closest: { element: HTMLElement | null; offset: number } = { element: null, offset: Number.NEGATIVE_INFINITY };

		for (const card of cards) {
			const box = card.getBoundingClientRect();
			const offset = y - box.top - box.height / 2;

			if (offset < 0 && offset > closest.offset) {
				closest = { element: card, offset };
			}
		}

		return closest.element;
	}

	private moveItem(item: TodoItem, newState: TodoState, beforeId?: string): void {
		this.insertItem(item, newState, beforeId);
	}

	private insertItem(item: TodoItem, newState: TodoState, beforeId?: string, silent = false): void {
		const oldState = item.state;
		const oldStyle = this.getStyleByState(oldState);
		const newStyle = this.getStyleByState(newState);

		// Update item state
		item.state = newState;
		if (newStyle === 'delete-line') {
			item.text = this.applyDeleteLine(item.text);
		} else if (oldStyle === 'delete-line') {
			item.text = this.removeDeleteLine(item.text);
		}

		// Remove from current position if it exists
		const index = this.items.findIndex(i => i.id === item.id);
		if (index > -1) {
			this.items.splice(index, 1);
		}

		// Find new position
		if (beforeId) {
			const beforeIndex = this.items.findIndex(i => i.id === beforeId);
			if (beforeIndex > -1) {
				this.items.splice(beforeIndex, 0, item);
			} else {
				this.items.push(item);
			}
		} else {
			// Add to end of items with same state
			const lastSameState = this.items.map((i, idx) => ({ item: i, idx }))
				.filter(x => x.item.state === newState)
				.pop();

			if (lastSameState) {
				this.items.splice(lastSameState.idx + 1, 0, item);
			} else {
				// Find position based on column order
				const stateOrder = this.columns.map(column => column.id);
				const targetStateIndex = stateOrder.indexOf(newState);
				const normalizedTargetIndex = targetStateIndex === -1 ? Number.MAX_SAFE_INTEGER : targetStateIndex;

				let insertIndex = 0;
				for (let i = 0; i < this.items.length; i++) {
					const itemStateIndex = stateOrder.indexOf(this.items[i]!.state);
					const normalizedItemIndex = itemStateIndex === -1 ? Number.MAX_SAFE_INTEGER : itemStateIndex;
					if (normalizedItemIndex <= normalizedTargetIndex) {
						insertIndex = i + 1;
					}
				}
				this.items.splice(insertIndex, 0, item);
			}
		}

		// Re-render and notify
		if (!silent) {
			this.render();
			void this.triggerUpdate();
		}
	}

	private addNewItem(state: TodoState): void {
		const newItem: TodoItem = {
			id: crypto.randomUUID(),
			text: '',
			state,
			originalMarker: this.getColumnByState(state)?.marker ?? ' ',
			children: [],
		};

		// Add item to data model silently (no render)
		this.insertItem(newItem, state, undefined, true);

		// Find the column container
		const columnContainer = this.container.querySelector(`[data-state="${state}"]`) as HTMLElement;
		if (!columnContainer) {
			// Fallback: render normally if we can't find column
			this.render();
			return;
		}

		// Create the card manually to maintain user action context for mobile focus
		const card = columnContainer.createDiv({ cls: 'kanban-card' });
		card.dataset['id'] = newItem.id;
		card.draggable = true;

		const textEl = card.createDiv({ cls: 'kanban-card-text' });

		// Immediately start editing (this keeps the user action context for mobile)
		this.startEditingNew(card, textEl, newItem);
	}

	private startEditingNew(card: HTMLElement, textEl: HTMLElement, item: TodoItem): void {
		card.draggable = false;
		card.addClass('kanban-card-editing');

		const input = document.createElement('textarea');
		input.className = 'kanban-edit-input';
		input.value = '';
		input.rows = 1;

		textEl.replaceWith(input);

		// Add suggestions for tags and files
		new KanbanSuggest(this.app, input);

		// Focus immediately - this maintains user action context for mobile
		input.focus();
		input.select();

		// Auto-resize using CSS custom property
		const resize = () => {
			input.setCssProps({ '--input-height': 'auto' });
			input.setCssProps({ '--input-height': input.scrollHeight + 'px' });
		};
		resize();
		input.addEventListener('input', resize);

		const deleteItem = () => {
			const index = this.items.findIndex(i => i.id === item.id);
			if (index > -1) {
				this.items.splice(index, 1);
			}
			this.render();
			void this.triggerUpdate();
		};

		const save = () => {
			const newText = input.value.trim();
			if (newText === '') {
				// Remove item if text is empty
				deleteItem();
			} else {
				item.text = this.formatTextForState(newText, item.state);
				this.render();
				void this.triggerUpdate();
			}
		};

		const cancel = () => {
			// Remove new item on cancel
			const index = this.items.findIndex(i => i.id === item.id);
			if (index > -1) {
				this.items.splice(index, 1);
			}
			this.render();
		};

		input.addEventListener('blur', save);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				input.blur();
			} else if (e.key === 'Escape') {
				input.removeEventListener('blur', save);
				cancel();
			}
		});
	}

	private startEditing(card: HTMLElement, item: TodoItem, isNew = false): void {
		card.draggable = false;
		card.addClass('kanban-card-editing');

		const textEl = card.querySelector('.kanban-card-text');
		if (!textEl) return;

		const input = document.createElement('textarea');
		input.className = 'kanban-edit-input';
		input.value = item.text;
		input.rows = 1;

		textEl.replaceWith(input);

		// Add suggestions for tags and files
		new KanbanSuggest(this.app, input);

		input.focus();
		input.select();

		// Auto-resize using CSS custom property
		const resize = () => {
			input.setCssProps({ '--input-height': 'auto' });
			input.setCssProps({ '--input-height': input.scrollHeight + 'px' });
		};
		resize();
		input.addEventListener('input', resize);

		const deleteItem = () => {
			const index = this.items.findIndex(i => i.id === item.id);
			if (index > -1) {
				this.items.splice(index, 1);
			}
			this.render();
			void this.triggerUpdate();
		};

		const save = () => {
			const newText = input.value.trim();
			if (newText === '') {
				// Remove item if text is empty
				deleteItem();
				return;
			}
			item.text = this.formatTextForState(newText, item.state);
			this.render();
			void this.triggerUpdate();
		};

		const cancel = () => {
			if (isNew) {
				// Remove new item on cancel
				const index = this.items.findIndex(i => i.id === item.id);
				if (index > -1) {
					this.items.splice(index, 1);
				}
			}
			this.render();
		};

		input.addEventListener('blur', save);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				input.blur();
			} else if (e.key === 'Escape') {
				input.removeEventListener('blur', save);
				cancel();
			}
		});
	}
}
