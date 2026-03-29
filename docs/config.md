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

## Detailed Configuration Guide

### Authentication
Auto-Doc supports two ways to authenticate with Google's Gemini models:

#### 1. Google AI API Key (Standard)
The simplest way to get started. Obtain a key from [Google AI Studio](https://aistudio.google.com/) and set:
- `autodoc.apiKey`: Your API key string.

#### 2. Vertex AI (Enterprise/GCP)
If you prefer using Google Cloud Platform, you can use Vertex AI. This method uses **Application Default Credentials (ADC)**.
- `autodoc.googleCloudProjectId`: Your GCP Project ID.
- `autodoc.googleCloudRegion`: (Optional) Defaults to `global`.
- **Note**: Ensure you have run `gcloud auth application-default login` on your machine, or your environment has the `GOOGLE_APPLICATION_CREDENTIALS` variable set.

---

### Glob Patterns (minimatch)
Auto-Doc uses the [minimatch](https://www.npmjs.com/package/minimatch) library for all source mapping and exclusion patterns. This ensures powerful and flexible file matching.

**Supported Features:**
- **Brace Expansion**: `src/**/*.{ts,js}` matches both TypeScript and JavaScript files.
- **Extended Glob Matching**: `+(errors|utils)/*.ts` matches files in either the `errors` or `utils` directory.
- **"Globstar" `**` Matching**: `src/**/*.ts` matches all `.ts` files recursively in the `src` directory.

---

### Multi-Root Workspace Support
Auto-Doc is designed for complex, multi-root environments.

- **Settings Scoping**: You can define different mappings for each workspace folder by using folder-level `settings.json` files.
- **Path Resolution**: When a commit happens in a repository that spans multiple workspace folders, Auto-Doc correctly identifies which folder a changed file belongs to and applies the appropriate mapping for that folder.
- **Folder Names**: In multi-root setups, glob patterns are matched against the relative path *within* the workspace folder.

---

## Examples

### Advanced Multi-Root Vertex AI Setup
In a multi-root workspace, you might have a folder-specific `.vscode/settings.json`:

```json
{
  "autodoc.googleCloudProjectId": "my-enterprise-project",
  "autodoc.triggerOnCommit": "always",
  "autodoc.mappings": [
    {
      "name": "Backend Services",
      "source": "services/**/!(test)/*.go",
      "doc": "docs/services.md"
    }
  ]
}
```

### Programmatic Usage
Loading configuration within the extension:

```typescript
import { Config } from "./config/config";

const currentConfig = Config.load();
console.log(`Using model: ${currentConfig.model}`);
```