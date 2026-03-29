# docs/utils.md

> **Overview**
> Utilities for interacting with the VS Code Git extension, providing access to repository metadata and file change tracking, and providing system-wide logging.

## Table of Contents
- [Table of Contents](#table-of-contents)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
    - [GitContext](#gitcontext)
    - [GitHandler](#githandler)
    - [Logger](#logger)
- [Examples](#examples)

---

## Core Concepts
The `GitHandler` utility serves as a bridge between the Auto-Doc extension and the built-in VS Code Git extension. It abstracts the complexity of the Git API to provide straightforward methods for:
- Accessing workspace repositories and their root paths by index or path.
- Identifying changed files in the working tree.
- Retrieving file changes from specific commits (diffing against parents).
- Extracting commit metadata (author, hash, message) for documentation context.

## API Reference

### GitContext
[source](../src/utils/gitHandler.ts)

An interface representing the metadata of a specific Git commit.

- `hash`: `string` - The unique identifier for the commit.
- `message`: `string` - The commit message content.
- `author`: `string` - The name of the person who created the commit.
- `author_email`: `string` - The email address of the commit author.
- `date`: `string` - The ISO timestamp of the commit.

### GitHandler
[source](../src/utils/gitHandler.ts)

A class that manages interactions with the `vscode.git` extension.

#### constructor(logger: Logger)
Initializes the handler and attempts to activate the Git extension API.

#### getChangedFiles(repoPathOrIndex: string | number = 0): string[]
Returns an array of absolute paths for files currently modified in the working tree. It accepts either the numeric index of the repository or its file system path. It filters out deleted files (status 4).

#### async getCommitChanges(repoPathOrIndex: string | number = 0, hash?: string): Promise<string[]>
Asynchronously retrieves the list of files modified in a specific commit for the repository identified by index or path. If no `hash` is provided, it defaults to `HEAD`. The method performs a diff between the reference and its parent (`ref~1`).

#### getCommitContext(repoPathOrIndex: string | number = 0): GitContext | undefined
Retrieves metadata about the current `HEAD` of the specified repository (by index or path). Returns `undefined` if the repository is not found or if the HEAD is not pointing to a commit.

#### getRepositoryCount(): number
Returns the total number of repositories discovered by the Git extension in the current workspace.

#### getRepositoryRoot(repoPathOrIndex: string | number): string | undefined
Returns the file system path of the root directory for the repository at the given index or path.

### Logger
[source](../src/utils/logger.ts)

A class used to manage logging output within the VS Code environment, specifically targeting an output channel with formatted timestamps and severity levels.

#### constructor(outputChannel: vscode.OutputChannel)
Initializes the logger with a specific VS Code output channel.

#### log(message: string): void
Appends an info-level message to the output channel, prefixed with a UTC timestamp.

#### warn(message: string): void
Appends a warning-level message to the output channel, prefixed with a UTC timestamp.

#### error(message: string): void
Appends an error-level message to the output channel, prefixed with a UTC timestamp.

## Examples
*(High-level examples of how to use these utilities will be added here).*