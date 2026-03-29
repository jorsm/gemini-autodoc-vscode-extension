# Auto-Doc VS Code Extension

An intelligent AI agent that watches your Git commits and automatically updates documentation using Google's Gemini models.

## Features

- **Automatic Documentation Updates**: Triggers on Git commits via VS Code's Git extension.
- **Configurable Mappings**: Map source code files to documentation files using glob patterns.
- **Context Awareness**: Include global context files (like README.md) in AI prompts.
- **Gemini Integration**: Uses Google's Gemini 3 models for deep reasoning about code changes.

## Usage

1. **Initialize**: Run the "Auto-Doc: Initialize" command from the VS Code Command Palette (`Cmd/Ctrl+Shift+P`).
2. **Configure**: Set up your mappings and Gemini API key in VS Code settings.
3. **Commit**: Make code changes and commit. The extension will automatically update your documentation files.

## Documentation

For detailed configuration options, API reference, and development guides, please refer to the [Developer Documentation](docs/DEVELOPMENT.md).

## Requirements

- VS Code with Git extension installed.
- Google Gemini API key or Vertex AI project.