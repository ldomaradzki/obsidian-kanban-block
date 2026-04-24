export type TodoState = string;

export interface TodoItem {
	id: string;
	text: string;
	state: TodoState;
	originalMarker: string; // Original checkbox character (space, x, /, ?, etc.)
	children: string[]; // Indented lines that belong to this item
}

export interface ParseResult {
	items: TodoItem[];
	ignoredLines: string[]; // Non-checkbox lines that couldn't be parsed
	unmatchedCount: number;
}

export interface KanbanColumn {
	state: TodoState;
	title: string;
	items: TodoItem[];
	collapse?: boolean;
}
