# Auto-Doc: Gemini-Powered Documentation Sync

**Stop letting your documentation rot.** Auto-Doc is an intelligent AI agent for VS Code that watches your Git commits and automatically synchronizes your documentation with your code changes using Google's powerful Gemini models.

## 🚀 The Value Proposition

Keeping documentation in sync with a fast-moving codebase is a manual, error-prone chore. Auto-Doc automates this by:
- **Instant Updates**: Triggers the moment you commit code, ensuring your docs never lag behind.
- **Context-Aware Generation**: Uses your commit messages, changed code, and global context files (like your README) to generate meaningful updates.
- **Reasoning Depth**: Leverages Gemini's "Thinking" capabilities to understand *why* changes were made, not just *what* changed.
- **Total Control**: You decide which files map to which docs and whether updates happen automatically or only when you say so.

---

## 🛠️ Key Features

- **Smart Mappings**: Use powerful glob patterns powered by [minimatch](https://www.npmjs.com/package/minimatch) to link source directories to specific documentation files. 
    - **Brace Expansion**: `src/**/*.{ts,js}` matches both `.ts` and `.js`.
    - **Extended Glob Matching**: `+(errors|utils)/*.ts` matches files in `errors` or `utils`.
    - **"Globstar" `**` Matching**: `src/**/*.ts` matches all `.ts` recursively.
- **Git-Triggered Workflow**: 
    - `always`: Seamless background updates.
    - `ask`: A quick confirmation prompt after every commit.
    - `manual`: Only when you run the sync command.
- **Deep Context**: Include "Global Context" files that are always fed to the AI to maintain consistent terminology and style.
- **Custom Templates**: Fully customize the AI's logic by overriding the internal Handlebars templates for prompts and doc skeletons.
- **Enterprise Ready**: Supports both individual **Gemini API Keys** and **Google Cloud Vertex AI** (via Application Default Credentials).

---

## 📖 Getting Started

### 1. Initialization
Open your project and run the **Auto-Doc: Initialize** command from the Command Palette (`Cmd/Ctrl+Shift+P`).
This creates a `.autodoc` folder with default templates you can customize later.

### 2. Configuration
Add your mappings to your `settings.json` or via the VS Code Settings UI. For a full breakdown of all configuration options, including **Vertex AI** and **Multi-Root Workspace** setups, see our [Detailed Configuration Guide](docs/config.md).

```json
{
  "autodoc.apiKey": "YOUR_GEMINI_API_KEY",
  "autodoc.triggerOnCommit": "ask",
  "autodoc.mappings": [
    {
      "name": "Core Logic",
      "source": "src/core/**/*.ts",
      "doc": "docs/architecture.md"
    }
  ]
}
```

### 3. Proficient Usage
- **Thinking Levels**: Set `autodoc.thinkingLevel` to `high` for complex architectural changes, or `low` for faster, simpler updates.
- **Global Context**: Add your high-level design docs to `autodoc.contextFiles` so the AI always understands your project's "big picture."
- **Exclusion Rules**: Use the `exclude` property in mappings to ignore test files or generated assets.

---

## ⌨️ Commands & Settings

### Commands
- `autodoc.init`: Initialize the project with default templates.
- `autodoc.sync`: Manually trigger a documentation synchronization.

### Key Settings
- `autodoc.model`: Choose your Gemini model (defaults to `gemini-3-flash-preview`).
- `autodoc.triggerOnCommit`: `always`, `ask`, or `manual`.
- `autodoc.googleCloudProjectId`: Set this to use Vertex AI instead of an API key.

---

## ⚖️ Requirements

- **VS Code 1.74.0+**
- **Git Extension**: Built-in VS Code Git extension must be enabled.
- **Gemini API Access**: An API key from Google AI Studio or a GCP Project with Vertex AI enabled.

---

## 📄 License
MIT
