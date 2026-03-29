# docs/extension.md

> **Overview**
> The entry point for the Auto-Doc VS Code extension. It manages the extension lifecycle, registers user commands, and monitors Git repositories to automate documentation synchronization.

## Table of Contents
- [Table of Contents](#table-of-contents)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
    - [activate [source](src/extension.ts)](#activate-sourcesrcextensionts)
    - [initProject [source](src/extension.ts)](#initproject-sourcesrcextensionts)
    - [syncDocs [source](src/extension.ts)](#syncdocs-sourcesrcextensionts)
    - [deactivate [source](src/extension.ts)](#deactivate-sourcesrcextensionts)
- [Examples](#examples)

---

## Core Concepts
The extension acts as a bridge between the local Git environment and the Gemini-powered documentation engine.

- **Lifecycle Management**: Initializes the logger and dependencies when the extension is activated via `onStartupFinished`.
- **Git Integration**: Leverages the built-in VS Code Git extension to track commit events across all open repositories.
- **Command Dispatching**: Provides interactive commands for users to initialize project templates and manually trigger documentation syncs.
- **Mapping & Routing**: Analyzes file changes and applies glob-based mapping logic to determine which documentation files require updates.

## API Reference

### activate [source](src/extension.ts)
Initializes the extension's internal state, creates the output channel for logging, and registers the primary command handlers. It also attempts to activate the Git extension to begin monitoring repository changes.

**Parameters:**
- `context`: `vscode.ExtensionContext` - The extension context provided by VS Code.

### initProject [source](src/extension.ts)
An asynchronous function that sets up the necessary infrastructure for Auto-Doc within a workspace folder.
- Creates the `.autodoc` and `.autodoc/templates` directories.
- Copies default Handlebars (`.hbs`) templates used for system instructions and document generation.
- Prompts the user to select a workspace folder if multiple are open.

### syncDocs [source](src/extension.ts)
The core orchestration function for updating documentation.
- **Parameters**:
    - `repoIndex` (optional): `number` - The index of the specific repository to sync. If omitted, all repositories are processed.
    - `isCommitTrigger` (optional): `boolean` - Whether the sync was triggered by a Git commit (affects how changed files are collected).
- **Logic**:
    1. Identifies changed files in the target repository.
    2. Loads workspace configurations.
    3. Matches changed files against defined mappings (including exclusion rules).
    4. Groups updates by target documentation path.
    5. Invokes the `DocGenerator` to perform AI-driven updates.

### deactivate [source](src/extension.ts)
Standard VS Code deactivation hook for cleanup. Currently performs no specific cleanup tasks.

## Examples
*(Specific implementation examples for extension hooks or command usage can be added here).*