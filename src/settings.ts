import { App, PluginSettingTab, Setting } from 'obsidian';
import type KanbanBlockPlugin from './main';

export interface KanbanBlockSettings {
	columnNames: {
		todo: string;
		inProgress: string;
		done: string;
	};
	centerBoard: boolean;
}

export const DEFAULT_SETTINGS: KanbanBlockSettings = {
	columnNames: {
		todo: 'To do',
		inProgress: 'In progress',
		done: 'Done',
	},
	centerBoard: false,
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

		new Setting(containerEl).setName('Column names').setHeading();

		new Setting(containerEl)
			.setName('To do column')
			.setDesc('Name for the first column')
			.addText(text => text
				.setPlaceholder('To do')
				.setValue(this.plugin.settings.columnNames.todo)
				.onChange(async (value) => {
					this.plugin.settings.columnNames.todo = value || 'To do';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('In progress column')
			.setDesc('Name for the middle column')
			.addText(text => text
				.setPlaceholder('In progress')
				.setValue(this.plugin.settings.columnNames.inProgress)
				.onChange(async (value) => {
					this.plugin.settings.columnNames.inProgress = value || 'In progress';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Done column')
			.setDesc('Name for the last column')
			.addText(text => text
				.setPlaceholder('Done')
				.setValue(this.plugin.settings.columnNames.done)
				.onChange(async (value) => {
					this.plugin.settings.columnNames.done = value || 'Done';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setName('Layout').setHeading();

		new Setting(containerEl)
			.setName('Center board')
			.setDesc('Center the kanban board horizontally')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.centerBoard)
				.onChange(async (value) => {
					this.plugin.settings.centerBoard = value;
					await this.plugin.saveSettings();
				}));
	}
}
