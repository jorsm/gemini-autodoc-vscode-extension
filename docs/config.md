# docs/config.md

> **Overview**
> This module manages the configuration for the Auto-Doc extension, handling the retrieval of settings from VS Code's workspace configuration and defining the structures for source-to-documentation mappings.

## Table of Contents
- [Table of Contents](#table-of-contents)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
    - [Mapping](#mapping)
    - [Config](#config)
    - [ConfigLoader](#configloader)
- [Examples](#examples)

---

## Core Concepts
The configuration system allows users to define how the AI agent interacts with their repository. It bridges VS Code's settings (defined in `package.json`) with the extension's internal logic. 

Key aspects include:
- **Model Selection**: Choosing the specific Gemini model and its reasoning depth (thinking level).
- **Mappings**: Defining glob patterns to link source code files to their corresponding documentation files.
- **Trigger Logic**: Determining when documentation updates should occur (automatically on commit, via prompt, or manually).
- **Authentication**: Supporting both API keys and Google Cloud Vertex AI (via Project ID and Application Default Credentials).

## API Reference

### Mapping
[source](../src/config/config.ts)
An interface defining the structure of a source-to-documentation file mapping.

**Properties:**
- `name` (string, optional): A descriptive name for the mapping.
- `source` (string): A glob pattern for source files to monitor.
- `doc` (string): The file path to the documentation file that should be updated.
- `exclude` (string[], optional): An array of glob patterns to exclude from the source search.

### Config
[source](../src/config/config.ts)
The primary interface representing the extension's runtime configuration.

**Properties:**
- `model` (string): The Gemini model ID to use for generation.
- `thinkingLevel` (string): The reasoning depth for the model (`low`, `medium`, or `high`).
- `mappings` (Mapping[]): An array of file mapping definitions.
- `contextFiles` (string[]): Global context files (like README.md) always included in AI prompts.
- `triggerOnCommit` ("always" | "ask" | "manual"): Determines the automation level for updates during Git commits.
- `apiKey` (string, optional): Google AI API key.
- `googleCloudProjectId` (string, optional): Google Cloud Project ID for Vertex AI integration.
- `googleCloudRegion` (string): The GCP region to use for Vertex AI (defaults to "global").
- `templates` (object): A dictionary of template overrides for documentation generation.

### ConfigLoader
[source](../src/config/config.ts)
A utility class responsible for reading and parsing settings from the VS Code workspace configuration.

**Methods:**
- `static load(scope?: vscode.ConfigurationScope): Config`: Retrieves the "autodoc" configuration section and returns a populated `Config` object with default values where necessary.

---

### Config (Alias)
[source](../src/config/config.ts)
A constant export that aliases `ConfigLoader` for convenient access.

## Examples

### Basic Configuration in settings.json
Users can configure the extension directly in their VS Code settings:

```json
{
  "autodoc.model": "gemini-3-flash-preview",
  "autodoc.thinkingLevel": "high",
  "autodoc.mappings": [
    {
      "name": "Python Source",
      "source": "src/**/*.py",
      "doc": "docs/reference.md",
      "exclude": ["**/tests/**"]
    }
  ],
  "autodoc.triggerOnCommit": "ask"
}
```

### Programmatic Usage
Loading configuration within the extension:

```typescript
import { Config } from "./config/config";

const currentConfig = Config.load();
console.log(`Using model: ${currentConfig.model}`);
```