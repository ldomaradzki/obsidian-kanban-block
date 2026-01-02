import KanbanBlockPlugin from 'main';
import { App, PluginSettingTab, Setting } from 'obsidian';

export class KanbanSettingTab extends PluginSettingTab {
  plugin: KanbanBlockPlugin;

  constructor(app: App, plugin: KanbanBlockPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
        .setName('Centering kanban')
        .setDesc('If enable, allow centering the kanban')
        .addToggle(toggle => toggle
           .setValue(this.plugin.settings.iscentering)
           .onChange(async (value) => {
              this.plugin.settings.iscentering = value;
              await this.plugin.saveSettings();
           })
        );
    }
}