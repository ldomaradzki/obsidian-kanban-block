import { AbstractInputSuggest, App, TFile } from 'obsidian';

export class KanbanSuggest extends AbstractInputSuggest<string | TFile> {
    constructor(public app: App, private inputEl: HTMLTextAreaElement) {
        super(app, inputEl as any);
    }

    getSuggestions(query: string): (string | TFile)[] {
        const cursor = this.inputEl.selectionStart;
        const text = this.inputEl.value.substring(0, cursor);

        // Check for tag trigger
        const tagMatch = text.match(/#([^\s#\[\]]*)$/);
        if (tagMatch) {
            const tagQuery = tagMatch[1]!.toLowerCase();
            const tags = new Set<string>();

            // Collect all tags from all files
            const files = this.app.vault.getMarkdownFiles();
            for (const file of files) {
                const cache = this.app.metadataCache.getFileCache(file);
                if (cache?.tags) {
                    for (const tag of cache.tags) {
                        tags.add(tag.tag);
                    }
                }
            }

            return Array.from(tags)
                .filter(tag => tag.toLowerCase().includes(tagQuery))
                .map(tag => tag.startsWith('#') ? tag : '#' + tag);
        }

        // Check for file trigger
        const fileMatch = text.match(/\[\[([^\]]*)$/);
        if (fileMatch) {
            const fileQuery = fileMatch[1]!.toLowerCase();
            const files = this.app.vault.getMarkdownFiles();
            return files.filter(file =>
                file.basename.toLowerCase().includes(fileQuery) ||
                file.path.toLowerCase().includes(fileQuery)
            );
        }

        return [];
    }

    renderSuggestion(value: string | TFile, el: HTMLElement): void {
        if (typeof value === 'string') {
            (el as any).setText(value);
        } else {
            (el as any).setText(value.basename);
            (el as any).createDiv({ cls: 'nav-file-tag', text: value.path });
        }
    }

    selectSuggestion(value: string | TFile, evt: MouseEvent | KeyboardEvent): void {
        const cursor = this.inputEl.selectionStart;
        const text = this.inputEl.value;
        const textBefore = text.substring(0, cursor);
        const textAfter = text.substring(cursor);

        let newTextBefore = '';

        if (typeof value === 'string') {
            // Tag
            newTextBefore = textBefore.replace(/#([^\s#\[\]]*)$/, value);
        } else {
            // File
            newTextBefore = textBefore.replace(/\[\[([^\]]*)$/, '[[' + value.basename + ']]');
        }

        this.inputEl.value = newTextBefore + textAfter;
        this.inputEl.selectionStart = this.inputEl.selectionEnd = newTextBefore.length;
        (this.inputEl as any).trigger('input');
        (this as any).close();
    }
}
