import { TodoItem, TodoState } from './types';

// Match any single character in checkbox
const TODO_REGEX = /^(-\s*\[(.)\]\s*)(.*)$/;

function markerToState(marker: string): TodoState {
	switch (marker) {
		case 'x': return 'done';
		case '/': return 'in-progress';
		default: return 'todo'; // space, ?, !, etc. all go to todo
	}
}

function stateToMarker(state: TodoState): string {
	switch (state) {
		case 'done': return 'x';
		case 'in-progress': return '/';
		default: return ' ';
	}
}

function getIndentLevel(line: string): number {
	const match = line.match(/^(\s*)/);
	return match ? match[1]!.length : 0;
}

export function parseTodoBlock(source: string): TodoItem[] {
	const lines = source.split('\n');
	const items: TodoItem[] = [];
	let currentItem: TodoItem | null = null;
	let currentIndent = 0;

	for (const line of lines) {
		const indent = getIndentLevel(line);
		const match = line.match(TODO_REGEX);

		if (match && indent === 0) {
			// Top-level todo item
			const marker = match[2];
			const text = match[3]?.trim() ?? '';
			if (marker !== undefined) {
				currentItem = {
					id: crypto.randomUUID(),
					text,
					state: markerToState(marker),
					originalMarker: marker,
					children: [],
				};
				currentIndent = 0;
				items.push(currentItem);
			}
		} else if (currentItem && line.trim() !== '') {
			// Indented content belongs to current item
			if (indent > currentIndent || currentItem.children.length > 0) {
				currentItem.children.push(line);
			}
		}
	}

	return items;
}

export function itemToMarkdown(item: TodoItem): string {
	// Use original marker if state matches, otherwise use new state's marker
	const expectedState = markerToState(item.originalMarker);
	const marker = (item.state === expectedState) ? item.originalMarker : stateToMarker(item.state);

	const mainLine = `- [${marker}] ${item.text}`;
	if (item.children.length === 0) {
		return mainLine;
	}
	return mainLine + '\n' + item.children.join('\n');
}

export function itemsToMarkdown(items: TodoItem[]): string {
	return items.map(itemToMarkdown).join('\n');
}
