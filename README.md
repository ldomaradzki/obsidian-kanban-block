# Kanban Block

A simple Obsidian plugin that renders todo checkboxes as an interactive kanban board.

![Screenshot](screenshot.png)

## Usage

Create a `todo` code block with checkbox items:

~~~markdown
```todo
- [ ] Task to do
- [/] Task in progress
- [x] Completed task
```
~~~

The plugin renders this as a 3-column kanban board:
- **To Do** — `[ ]`
- **In Progress** — `[/]`
- **Done** — `[x]`

### Features

- Drag and drop between columns
- Reorder within columns
- Changes sync back to markdown in real-time
- Supports wiki links, bold, italic, and other markdown inside tasks
- Nested items move with their parent (shown with `+N` badge)

## Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/YOUR_USERNAME/obsidian-kanban-block/releases)
2. Create a folder in your vault: `.obsidian/plugins/kanban-block/`
3. Copy the downloaded files into that folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

## Development

```bash
npm install
npm run dev    # Watch mode
npm run build  # Production build
```

## License

MIT
