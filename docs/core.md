# docs/core.md

> **Overview**
> The core module orchestrates the documentation generation process. It manages the interaction between workspace files, Handlebars templates, and the Gemini AI model to automatically update documentation based on code changes and Git context.

## Table of Contents
- [Table of Contents](#table-of-contents)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
    - [GitContext](#gitcontext)
    - [DocGenerator](#docgenerator)
    - [GeminiClient](#geminiclient)
- [Examples](#examples)

---

## Core Concepts
The core logic is split into two primary components:

1.  **DocGenerator**: Acts as the orchestrator. It resolves file paths with robust multi-root workspace support, loads source and context files, renders Handlebars templates for prompts, and manages the file system I/O for the resulting documentation.
2.  **GeminiClient**: A wrapper around the Google Generative AI SDK. It handles authentication (supporting both direct API keys and Vertex AI via Application Default Credentials) and communication with Gemini models, including support for "Thinking" configurations.

The generation process follows a structured pipeline:
- **Loading**: Reading source files and global context files (e.g., README.md). For source files, relative paths ("Target Links") are calculated to allow the AI to generate accurate source references. Context files are resolved against all workspace folders in multi-root setups.
- **Preparation**: Reading existing documentation or generating a skeleton using the `docSkeleton` template if the file is new.
- **Prompting**: Combining all data into a system instruction and a user prompt using Handlebars templates (`systemInstruction`, `docPrompt`). Templates are resolved with the following priority: user-defined configuration, workspace-local (`.autodoc/templates/`), and finally internal defaults.
- **Generation**: Sending the prompt to the AI and receiving a processed Markdown response.
- **Persistence**: Writing the cleaned Markdown back to the workspace using VS Code's filesystem API.

## API Reference

### GitContext
[source](../src/core/docGenerator.ts)

An interface representing the metadata of a Git commit used to provide context to the AI.

- `hash`: (Optional) The commit hash.
- `message`: (Optional) The commit message.
- `author`: (Optional) The author's name.
- `author_email`: (Optional) The author's email address.
- `date`: (Optional) The date of the commit.

### DocGenerator
[source](../src/core/docGenerator.ts)

The main class responsible for the documentation update workflow.

#### constructor(config, workspaceFolder, logger)
Initializes the generator with extension configuration, the target workspace folder, and a logger.

#### updateDocs(sourceFiles: string[], docTarget: string, gitContext?: GitContext): Promise<void>
Triggers a documentation update.
- `sourceFiles`: An array of relative paths to source code files.
- `docTarget`: The relative path to the documentation file being updated.
- `gitContext`: (Optional) Metadata about the commit triggering the update.

It handles path normalization for multi-root workspaces by stripping folder name prefixes before resolving absolute paths on the filesystem.

### GeminiClient
[source](../src/core/geminiClient.ts)

A client for interacting with Google's Gemini models.

#### constructor(config, logger)
Initializes the client with the necessary configuration for API access or Vertex AI integration.

#### generateDocumentation(prompt: string, systemInstruction?: string, thinkingLevel: string = "high"): Promise<string>
Sends a request to the Gemini API to generate content.
- `prompt`: The main user prompt containing code and context.
- `systemInstruction`: (Optional) High-level instructions for the model's behavior.
- `thinkingLevel`: The reasoning depth for the model (maps to `low`, `medium`, or `high`).

Returns the cleaned Markdown text from the AI response, stripping any markdown code block wrappers.

## Examples
*(No examples provided yet)*