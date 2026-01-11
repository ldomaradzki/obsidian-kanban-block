import { App, PluginSettingTab, Setting } from 'obsidian';
import type KanbanBlockPlugin from './main';
import { t, Language } from './i18n';

export interface ColumnNames {
	todo: string;
	inProgress: string;
	done: string;
}

export interface KanbanBlockSettings {
	columnNames: ColumnNames;
	centerBoard: boolean;
	language: Language;
	deleteDelay: number;
}

export const DEFAULT_SETTINGS: KanbanBlockSettings = {
	columnNames: {
		todo: 'To Do',
		inProgress: 'In Progress',
		done: 'Done',
	},
	centerBoard: false,
	language: 'en',
	deleteDelay: 0.75,
};

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
				.setValue(this.plugin.settings.language)
				.onChange(async (value: Language) => {
					this.plugin.settings.language = value;
					// Update column names to default for new language
					this.plugin.settings.columnNames = {
						todo: t('column_todo', value),
						inProgress: t('column_in_progress', value),
						done: t('column_done', value),
					};
					await this.plugin.saveSettings();
					this.display(); // Refresh settings to show new language
				})
			);

		// Column names heading
		new Setting(containerEl)
			.setName(t('settings_column_names', this.plugin.settings.language))
			.setHeading();

		new Setting(containerEl)
			.setName(t('settings_todo_column', this.plugin.settings.language))
			.addText(text => text
				.setPlaceholder(t('column_todo', this.plugin.settings.language))
				.setValue(this.plugin.settings.columnNames.todo)
				.onChange(async (value) => {
					this.plugin.settings.columnNames.todo = value || t('column_todo', this.plugin.settings.language);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t('settings_in_progress_column', this.plugin.settings.language))
			.addText(text => text
				.setPlaceholder(t('column_in_progress', this.plugin.settings.language))
				.setValue(this.plugin.settings.columnNames.inProgress)
				.onChange(async (value) => {
					this.plugin.settings.columnNames.inProgress = value || t('column_in_progress', this.plugin.settings.language);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t('settings_done_column', this.plugin.settings.language))
			.addText(text => text
				.setPlaceholder(t('column_done', this.plugin.settings.language))
				.setValue(this.plugin.settings.columnNames.done)
				.onChange(async (value) => {
					this.plugin.settings.columnNames.done = value || t('column_done', this.plugin.settings.language);
					await this.plugin.saveSettings();
				}));

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
