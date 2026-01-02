# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode (auto-rebuild on changes)
npm run build        # Production build with type checking
```

## Testing Locally

Copy built files to an Obsidian vault:
```bash
cp main.js manifest.json styles.css <vault>/.obsidian/plugins/kanban-block/
```
Then reload Obsidian (Cmd+R).

## Architecture

This is an Obsidian plugin that registers a markdown code block processor for `todo` blocks, rendering them as interactive kanban boards.

**Source files:**
- `main.ts` - Plugin entry point. Registers the `todo` code block processor and handles syncing changes back to the markdown source via editor API.
- `parser.ts` - Parses todo checkbox syntax (`[ ]`, `[/]`, `[x]`) into `TodoItem` objects. Handles nested/indented items as children of their parent.
- `kanban.ts` - Renders the 3-column kanban UI with drag-and-drop, inline editing, and add buttons. Uses Obsidian's `MarkdownRenderer` to render wiki links, bold, tags, etc. inside cards.
- `settings.ts` - Plugin settings (column names, center board toggle) and settings tab UI.
- `types.ts` - TypeScript interfaces (`TodoItem`, `TodoState`, `KanbanColumn`).
- `styles.css` - Theme-aware styling using Obsidian CSS variables.

**Data flow:**
1. User writes `todo` code block with checkbox items
2. `parser.ts` converts markdown to `TodoItem[]` (preserving original markers and nested children)
3. `kanban.ts` renders items in columns, handles drag events
4. On drop, `kanban.ts` calls `onUpdate` callback with new markdown
5. `main.ts` finds and replaces the code block content in the editor

## Release Process

Push a tag to trigger GitHub Actions release:
```bash
git tag -a X.Y.Z -m "Release description"
git push origin X.Y.Z
```
This creates a draft release with `main.js`, `manifest.json`, `styles.css`. Publish manually on GitHub.
