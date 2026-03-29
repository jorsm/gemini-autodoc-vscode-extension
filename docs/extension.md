# docs/extension.md

> **Overview**
> The entry point for the Auto-Doc VS Code extension. It manages the extension lifecycle, registers user commands, and monitors Git repositories to automate documentation synchronization.

## Table of Contents
- [Table of Contents](#table-of-contents)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
    - [activate](#activate)
    - [setupGitListeners](#setupgitlisteners)
    - [registerRepoListener](#registerrepolistener)
    - [initProject](#initproject)
    - [syncDocs](#syncdocs)
    - [deactivate](#deactivate)
- [Examples](#examples)

---

## Core Concepts
The extension acts as a bridge between the local Git environment and the Gemini-powered documentation engine.

- **Lifecycle Management**: Initializes the logger and dependencies when the extension is activated via `onStartupFinished`.
- **Git Integration**: Leverages the built-in VS Code Git extension to track commit events across all open repositories. It maintains a registry of the last known commit hashes to ensure synchronization only triggers on new changes.
- **Command Dispatching**: Provides interactive commands for users to initialize project templates and manually trigger documentation syncs.
- **Mapping & Routing**: Analyzes file changes and applies glob-based mapping logic to determine which documentation files require updates, handling multi-root workspaces by processing folders within repositories independently.

## API Reference

### activate [source](../src/extension.ts)
Initializes the extension's internal state, creates the output channel for logging, and registers the primary command handlers. It also attempts to activate the Git extension to begin monitoring repository changes.

**Parameters:**
- `context`: `vscode.ExtensionContext` - The extension context provided by VS Code.

### setupGitListeners [source](../src/extension.ts)
Sets up the event listeners for the Git extension. It discovers currently open repositories and registers listeners for any repositories opened in the future.

**Parameters:**
- `context`: `vscode.ExtensionContext` - The extension context used to manage subscriptions.

### registerRepoListener [source](../src/extension.ts)
Attaches a listener to a specific Git repository's state. It monitors the `HEAD` commit and triggers a documentation sync when a new commit hash is detected.

**Parameters:**
- `repo`: `any` - The Git repository object from the VS Code Git API.
- `context`: `vscode.ExtensionContext` - The extension context for subscription management.

### initProject [source](../src/extension.ts)
An asynchronous function that sets up the necessary infrastructure for Auto-Doc within a workspace folder.
- Creates the `.autodoc` and `.autodoc/templates` directories.
- Copies default Handlebars (`.hbs`) templates used for system instructions and document generation.
- Prompts the user to select a workspace folder if multiple are open.

### syncDocs [source](../src/extension.ts)
The core orchestration function for updating documentation.
- **Parameters**:
    - `repoIdentifier` (optional): `string | number` - The unique identifier (URI string or index) of the specific repository to sync. If omitted, all repositories are processed.
    - `isCommitTrigger` (optional): `boolean` - Whether the sync was triggered by a Git commit (affects how changed files are collected).
- **Logic**:
    1. Identifies changed files in the target repository using the Git handler.
    2. Retrieves the Git context (author, hash, message) for the current changes.
    3. Iterates through workspace folders contained within the repository.
    4. Loads workspace-specific configurations.
    5. Matches changed files against defined mappings (including exclusion rules).
    6. Groups updates by target documentation path.
    7. Invokes the `DocGenerator` for each folder to perform AI-driven updates.

### deactivate [source](../src/extension.ts)
Standard VS Code deactivation hook for cleanup. Currently performs no specific cleanup tasks.

## Examples
*(Specific implementation examples for extension hooks or command usage can be added here).*