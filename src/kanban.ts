import { App, Component, MarkdownRenderer } from 'obsidian';
import { TodoItem, TodoState, KanbanColumn } from './types';
import { itemsToMarkdown } from './parser';

const COLUMNS: { state: TodoState; title: string }[] = [
	{ state: 'todo', title: 'To Do' },
	{ state: 'in-progress', title: 'In Progress' },
	{ state: 'done', title: 'Done' },
];

export class KanbanBoard {
	private container: HTMLElement;
	private items: TodoItem[];
	private onUpdate: (markdown: string) => void;
	private app: App;
	private component: Component;
	private sourcePath: string;
	private draggedItem: TodoItem | null = null;
	private draggedElement: HTMLElement | null = null;

	constructor(
		container: HTMLElement,
		items: TodoItem[],
		onUpdate: (markdown: string) => void,
		app: App,
		component: Component,
		sourcePath: string
	) {
		this.container = container;
		this.items = items;
		this.onUpdate = onUpdate;
		this.app = app;
		this.component = component;
		this.sourcePath = sourcePath;
		this.render();
	}

	private getColumns(): KanbanColumn[] {
		return COLUMNS.map(col => ({
			...col,
			items: this.items.filter(item => item.state === col.state),
		}));
	}

	private render(): void {
		this.container.empty();
		this.container.addClass('kanban-board');

		const columns = this.getColumns();
		for (const column of columns) {
			this.renderColumn(column);
		}
	}

	private renderColumn(column: KanbanColumn): void {
		const colEl = this.container.createDiv({ cls: 'kanban-column' });
		colEl.dataset['state'] = column.state;

		const header = colEl.createDiv({ cls: 'kanban-column-header' });
		header.createSpan({ text: column.title, cls: 'kanban-column-title' });
		header.createSpan({ text: String(column.items.length), cls: 'kanban-column-count' });

		const itemsContainer = colEl.createDiv({ cls: 'kanban-column-items' });
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

		if (item.state === 'done') {
			card.addClass('kanban-card-done');
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

		card.addEventListener('dragstart', (e) => this.handleDragStart(e, item, card));
		card.addEventListener('dragend', () => this.handleDragEnd());
		card.addEventListener('dblclick', (e) => {
			e.preventDefault();
			this.startEditing(card, item);
		});
	}

	private handleDragStart(e: DragEvent, item: TodoItem, element: HTMLElement): void {
		this.draggedItem = item;
		this.draggedElement = element;
		element.addClass('kanban-card-dragging');

		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', item.id);
		}
	}

	private handleDragEnd(): void {
		if (this.draggedElement) {
			this.draggedElement.removeClass('kanban-card-dragging');
		}
		this.draggedItem = null;
		this.draggedElement = null;

		// Remove all drag-over states
		this.container.querySelectorAll('.kanban-drag-over').forEach(el => {
			el.removeClass('kanban-drag-over');
		});
		this.container.querySelectorAll('.kanban-drop-indicator').forEach(el => {
			el.remove();
		});
	}

	private setupDropZone(container: HTMLElement, state: TodoState): void {
		container.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (!this.draggedItem) return;

			container.addClass('kanban-drag-over');

			const afterElement = this.getDragAfterElement(container, e.clientY);
			const indicator = this.getOrCreateIndicator(container);

			if (afterElement) {
				afterElement.before(indicator);
			} else {
				container.appendChild(indicator);
			}
		});

		container.addEventListener('dragleave', (e) => {
			const relatedTarget = e.relatedTarget as HTMLElement | null;
			if (!relatedTarget || !container.contains(relatedTarget)) {
				container.removeClass('kanban-drag-over');
				container.querySelector('.kanban-drop-indicator')?.remove();
			}
		});

		container.addEventListener('drop', (e) => {
			e.preventDefault();
			container.removeClass('kanban-drag-over');
			container.querySelector('.kanban-drop-indicator')?.remove();

			if (!this.draggedItem) return;

			const afterElement = this.getDragAfterElement(container, e.clientY);
			this.moveItem(this.draggedItem, state, afterElement?.dataset['id']);
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
		// Update item state
		item.state = newState;

		// Remove from current position
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
				const stateOrder = COLUMNS.map(c => c.state);
				const targetStateIndex = stateOrder.indexOf(newState);

				let insertIndex = 0;
				for (let i = 0; i < this.items.length; i++) {
					const itemStateIndex = stateOrder.indexOf(this.items[i]!.state);
					if (itemStateIndex <= targetStateIndex) {
						insertIndex = i + 1;
					}
				}
				this.items.splice(insertIndex, 0, item);
			}
		}

		// Re-render and notify
		this.render();
		this.onUpdate(itemsToMarkdown(this.items));
	}

	private addNewItem(state: TodoState): void {
		const newItem: TodoItem = {
			id: crypto.randomUUID(),
			text: '',
			state,
			originalMarker: state === 'done' ? 'x' : state === 'in-progress' ? '/' : ' ',
			children: [],
		};

		// Find position to insert based on state order
		const stateOrder = COLUMNS.map(c => c.state);
		const targetStateIndex = stateOrder.indexOf(state);

		let insertIndex = 0;
		for (let i = 0; i < this.items.length; i++) {
			const itemStateIndex = stateOrder.indexOf(this.items[i]!.state);
			if (itemStateIndex <= targetStateIndex) {
				insertIndex = i + 1;
			}
		}

		this.items.splice(insertIndex, 0, newItem);
		this.render();

		// Find the new card and start editing it
		const newCard = this.container.querySelector(`[data-id="${newItem.id}"]`) as HTMLElement;
		if (newCard) {
			this.startEditing(newCard, newItem, true);
		}
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
		input.focus();
		input.select();

		// Auto-resize
		const resize = () => {
			input.style.height = 'auto';
			input.style.height = input.scrollHeight + 'px';
		};
		resize();
		input.addEventListener('input', resize);

		const deleteItem = () => {
			const index = this.items.findIndex(i => i.id === item.id);
			if (index > -1) {
				this.items.splice(index, 1);
			}
			this.render();
			this.onUpdate(itemsToMarkdown(this.items));
		};

		const save = () => {
			const newText = input.value.trim();
			if (newText === '') {
				// Remove item if text is empty
				deleteItem();
			} else {
				item.text = newText;
				this.render();
				this.onUpdate(itemsToMarkdown(this.items));
			}
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
