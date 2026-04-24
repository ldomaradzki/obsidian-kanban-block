import { TodoItem, TodoState, ParseResult } from './types';
import type { ColumnConfig } from './settings';

// Match any single character in checkbox
const TODO_REGEX = /^(-\s*\[(.)\]\s*)(.*)$/;

function getUnmatchedState(marker: string): TodoState {
	return `__unmatched__:${marker}`;
}

function buildMarkerToStateMap(columns: ColumnConfig[]): Map<string, TodoState> {
	const map = new Map<string, TodoState>();
	for (const column of columns) {
		if (!map.has(column.marker)) {
			map.set(column.marker, column.id);
		}
	}
	return map;
}

function buildStateToMarkerMap(columns: ColumnConfig[]): Map<TodoState, string> {
	const map = new Map<TodoState, string>();
	for (const column of columns) {
		if (!map.has(column.id)) {
			map.set(column.id, column.marker);
		}
	}
	return map;
}

function markerToState(marker: string, markerMap: Map<string, TodoState>): TodoState {
	return markerMap.get(marker) ?? getUnmatchedState(marker);
}

function stateToMarker(state: TodoState, stateMap: Map<TodoState, string>, fallbackMarker: string): string {
	const marker = stateMap.get(state);
	if (marker !== undefined) {
		return marker;
	}
	return fallbackMarker;
}

function stateFromOriginalMarker(marker: string, markerMap: Map<string, TodoState>): TodoState {
	return markerMap.get(marker) ?? getUnmatchedState(marker);
}

function getIndentLevel(line: string): number {
	const match = line.match(/^(\s*)/);
	return match ? match[1]!.length : 0;
}

function stripCommonIndent(lines: string[]): string[] {
	const nonEmptyLines = lines.filter(line => line.trim() !== '');
	if (nonEmptyLines.length === 0) return lines;

	const minIndent = Math.min(...nonEmptyLines.map(getIndentLevel));
	if (minIndent === 0) return lines;

	return lines.map(line => line.slice(minIndent));
}

export function parseTodoBlock(source: string, columns: ColumnConfig[]): ParseResult {
	const markerMap = buildMarkerToStateMap(columns);
	const rawLines = source.split('\n');
	const lines = stripCommonIndent(rawLines);
	const items: TodoItem[] = [];
	const ignoredLines: string[] = [];
	let unmatchedCount = 0;
	let currentItem: TodoItem | null = null;
	let baseIndent = 0;

	for (const line of lines) {
		const indent = getIndentLevel(line);
		const match = line.match(TODO_REGEX);

		if (match && indent === 0) {
			// Top-level todo item
			const marker = match[2];
			const text = match[3]?.trim() ?? '';
			if (marker !== undefined) {
				const state = markerToState(marker, markerMap);
				if (state.startsWith('__unmatched__:')) {
					unmatchedCount += 1;
				}
				currentItem = {
					id: crypto.randomUUID(),
					text,
					state,
					originalMarker: marker,
					children: [],
				};
				baseIndent = 0;
				items.push(currentItem);
			}
		} else if (currentItem && indent > baseIndent && line.trim() !== '') {
			// Indented content belongs to current item
			currentItem.children.push(line);
		} else if (line.trim() !== '') {
			// Non-checkbox line at top level - track it
			ignoredLines.push(line);
			currentItem = null; // Reset so subsequent indented lines don't attach
		}
	}

	return { items, ignoredLines, unmatchedCount };
}

export function itemToMarkdown(item: TodoItem, columns: ColumnConfig[]): string {
	const markerToStateMap = buildMarkerToStateMap(columns);
	const stateToMarkerMap = buildStateToMarkerMap(columns);
	// Use original marker if state matches, otherwise use new state's marker
	const expectedState = stateFromOriginalMarker(item.originalMarker, markerToStateMap);
	const marker = (item.state === expectedState)
		? item.originalMarker
		: stateToMarker(item.state, stateToMarkerMap, item.originalMarker);

	const mainLine = `- [${marker}] ${item.text}`;
	if (item.children.length === 0) {
		return mainLine;
	}
	return mainLine + '\n' + item.children.join('\n');
}

export function itemsToMarkdown(items: TodoItem[], columns: ColumnConfig[], ignoredLines: string[] = []): string {
	const todoMarkdown = items.map(item => itemToMarkdown(item, columns)).join('\n');
	if (ignoredLines.length === 0) {
		return todoMarkdown;
	}
	return ignoredLines.join('\n') + '\n' + todoMarkdown;
}
