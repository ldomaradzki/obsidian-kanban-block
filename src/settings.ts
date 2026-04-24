import { App, PluginSettingTab, Setting } from 'obsidian';
import type KanbanBlockPlugin from './main';
import { t, Language, tp } from './i18n';

export type ColumnStyle = 'none' | 'fade' | 'delete-line';

export interface ColumnConfig {
	id: string;
	name: string;
	marker: string;
	style: ColumnStyle;
	collapse: boolean;
}

export interface KanbanBlockSettings {
	columnCount: number;
	columns: ColumnConfig[];
	centerBoard: boolean;
	language: Language;
	deleteDelay: number;
}

const MIN_COLUMN_COUNT = 1;
const MAX_COLUMN_COUNT = 10;

function normalizeColumnStyle(style: unknown): ColumnStyle {
	if (typeof style !== 'string') return 'none';
	const normalized = style.trim().toLowerCase();
	if (normalized === 'fade') return 'fade';
	if (normalized === 'delete-line' || normalized === 'deleteline') return 'delete-line';
	return 'none';
}

function sanitizeMarker(marker: string, fallback = ' '): string {
	if (marker.length === 0) return fallback;
	return marker[0] ?? fallback;
}

function defaultColumnName(index: number, lang: Language): string {
	return tp('settings_column_default_name', lang, { index: String(index + 1) });
}

function createBaseColumns(lang: Language): ColumnConfig[] {
	return [
		{ id: 'todo', name: t('column_todo', lang), marker: ' ', style: 'none', collapse: false },
		{ id: 'in-progress', name: t('column_in_progress', lang), marker: '/', style: 'none', collapse: false },
		{ id: 'done', name: t('column_done', lang), marker: 'x', style: 'fade', collapse: false },
	];
}

function resizeColumns(columns: ColumnConfig[], count: number, lang: Language): ColumnConfig[] {
	const next = columns.slice(0, count).map((col, idx) => ({
		id: col.id || `column-${idx + 1}`,
		name: col.name || defaultColumnName(idx, lang),
		marker: sanitizeMarker(col.marker ?? ' '),
		style: normalizeColumnStyle(col.style),
		collapse: Boolean(col.collapse),
	}));

	for (let i = next.length; i < count; i++) {
		next.push({
			id: `column-${i + 1}`,
			name: defaultColumnName(i, lang),
			marker: i === 0 ? ' ' : i === 1 ? '/' : i === 2 ? 'x' : String(i + 1).slice(-1),
			style: i === 2 ? 'fade' : 'none',
			collapse: false,
		});
	}

	return next;
}

export const DEFAULT_SETTINGS: KanbanBlockSettings = {
	columnCount: 3,
	columns: createBaseColumns('en'),
	centerBoard: false,
	language: 'en',
	deleteDelay: 0.75,
};

export function normalizeSettings(raw: unknown): KanbanBlockSettings {
	const data = (raw && typeof raw === 'object') ? raw as Partial<KanbanBlockSettings> & {
		columnNames?: { todo?: string; inProgress?: string; done?: string };
	} : {};
	const language = data.language ?? DEFAULT_SETTINGS.language;
	const countFromRaw = Number(data.columnCount);
	const legacyNames = data.columnNames;
	const hasLegacyColumns = Boolean(legacyNames && typeof legacyNames === 'object');

	let columns: ColumnConfig[] = [];
	if (Array.isArray(data.columns)) {
		columns = data.columns.map((col, idx) => ({
			id: typeof col.id === 'string' && col.id ? col.id : `column-${idx + 1}`,
			name: typeof col.name === 'string' && col.name ? col.name : defaultColumnName(idx, language),
			marker: sanitizeMarker(typeof col.marker === 'string' ? col.marker : ' '),
			style: normalizeColumnStyle(col.style),
			collapse: Boolean(col.collapse),
		}));
	} else if (hasLegacyColumns) {
		columns = createBaseColumns(language).map((col) => {
			if (col.id === 'todo') return { ...col, name: legacyNames?.todo || col.name };
			if (col.id === 'in-progress') return { ...col, name: legacyNames?.inProgress || col.name };
			if (col.id === 'done') return { ...col, name: legacyNames?.done || col.name };
			return col;
		});
	}

	const columnCount = Number.isInteger(countFromRaw)
		? Math.max(MIN_COLUMN_COUNT, Math.min(MAX_COLUMN_COUNT, countFromRaw))
		: Math.max(MIN_COLUMN_COUNT, columns.length || DEFAULT_SETTINGS.columnCount);

	return {
		columnCount,
		columns: resizeColumns(columns.length ? columns : createBaseColumns(language), columnCount, language),
		centerBoard: Boolean(data.centerBoard ?? DEFAULT_SETTINGS.centerBoard),
		language,
		deleteDelay: typeof data.deleteDelay === 'number' && data.deleteDelay >= 0
			? data.deleteDelay
			: DEFAULT_SETTINGS.deleteDelay,
	};
}

export class KanbanBlockSettingTab extends PluginSettingTab {
	plugin: KanbanBlockPlugin;

	constructor(app: App, plugin: KanbanBlockPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Language setting
		new Setting(containerEl)
			.setName(t('settings_language', this.plugin.settings.language))
			.setDesc(t('settings_language_desc', this.plugin.settings.language))
			.addDropdown(dropdown => dropdown
				.addOption('en', 'English')
				.addOption('fr', 'Français')
				.addOption('es', 'Español')
				.addOption('zh', '中文')
				.setValue(this.plugin.settings.language)
				.onChange(async (value: Language) => {
					this.plugin.settings.language = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh settings to show new language
				})
			);

		// Column names heading
		new Setting(containerEl)
			.setName(t('settings_column_names', this.plugin.settings.language))
			.setDesc(t('settings_column_names_desc', this.plugin.settings.language))
			.setHeading();

		new Setting(containerEl)
			.setName(t('settings_column_count', this.plugin.settings.language))
			.setDesc(tp('settings_column_count_desc', this.plugin.settings.language, { min: String(MIN_COLUMN_COUNT), max: String(MAX_COLUMN_COUNT) }))
			.addText(text => text
				.setPlaceholder(String(this.plugin.settings.columnCount))
				.setValue(String(this.plugin.settings.columnCount))
				.onChange(async (value) => {
					const numValue = Number.parseInt(value, 10);
					if (Number.isNaN(numValue)) return;
					const nextCount = Math.max(MIN_COLUMN_COUNT, Math.min(MAX_COLUMN_COUNT, numValue));
					this.plugin.settings.columnCount = nextCount;
					this.plugin.settings.columns = resizeColumns(this.plugin.settings.columns, nextCount, this.plugin.settings.language);
					await this.plugin.saveSettings();
					this.display();
				}));

		this.plugin.settings.columns.forEach((column, idx) => {
			new Setting(containerEl)
				.setName(tp('settings_column_title', this.plugin.settings.language, { index: String(idx + 1) }))
				.setHeading();

			new Setting(containerEl)
				.setName(t('settings_column_name', this.plugin.settings.language))
				.addText(text => text
					.setPlaceholder(defaultColumnName(idx, this.plugin.settings.language))
					.setValue(column.name)
					.onChange(async (value) => {
						column.name = value || defaultColumnName(idx, this.plugin.settings.language);
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName(t('settings_column_marker', this.plugin.settings.language))
				.setDesc(t('settings_column_marker_desc', this.plugin.settings.language))
				.addText(text => text
					.setPlaceholder(column.marker)
					.setValue(column.marker)
					.onChange(async (value) => {
						column.marker = sanitizeMarker(value, column.marker || ' ');
						await this.plugin.saveSettings();
						this.display();
					}));

			new Setting(containerEl)
				.setName(t('settings_column_style', this.plugin.settings.language))
				.addDropdown(dropdown => dropdown
					.addOption('none', t('settings_style_none', this.plugin.settings.language))
					.addOption('fade', t('settings_style_fade', this.plugin.settings.language))
					.addOption('delete-line', t('settings_style_delete_line', this.plugin.settings.language))
					.setValue(column.style)
					.onChange(async (value: ColumnStyle) => {
						column.style = normalizeColumnStyle(value);
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName(t('settings_column_collapse', this.plugin.settings.language))
				.setDesc(t('settings_column_collapse_desc', this.plugin.settings.language))
				.addToggle(toggle => toggle
					.setValue(column.collapse)
					.onChange(async (value) => {
						column.collapse = value;
						await this.plugin.saveSettings();
					}));
		});

		// Layout heading
		new Setting(containerEl)
			.setName('Layout')
			.setHeading();

		// Center board setting
		new Setting(containerEl)
			.setName(t('settings_center_board', this.plugin.settings.language))
			.setDesc(t('settings_center_board_desc', this.plugin.settings.language))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.centerBoard)
				.onChange(async (value) => {
					this.plugin.settings.centerBoard = value;
					await this.plugin.saveSettings();
				}));

		// Delete delay setting
		new Setting(containerEl)
			.setName(t('settings_delete_delay', this.plugin.settings.language))
			.setDesc(t('settings_delete_delay_desc', this.plugin.settings.language))
			.addText(text => text
				.setPlaceholder('0.75')
				.setValue(String(this.plugin.settings.deleteDelay))
				.onChange(async (value) => {
					const numValue = parseFloat(value);
					if (!isNaN(numValue) && numValue >= 0) {
						this.plugin.settings.deleteDelay = numValue;
						await this.plugin.saveSettings();
					}
				}));
	}
}
