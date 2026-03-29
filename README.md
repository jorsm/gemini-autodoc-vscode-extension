# Auto-Doc VS Code Extension

An intelligent AI agent that watches your Git commits and automatically updates documentation using Google's Gemini models.

## Features

- **Automatic Documentation Updates**: Triggers on Git commits via VS Code's Git extension.
- **Configurable Mappings**: Map source code files to documentation files using glob patterns.
- **Context Awareness**: Include global context files (like README.md) in AI prompts.
- **Gemini Integration**: Uses Google's Gemini 3 models for deep reasoning about code changes.
- **Custom Templates**: Customize AI prompts and output using Handlebars templates.

## Installation

1. Clone or download this repository.
2. Run `npm install` in the `vscode-extension` directory.
3. Run `npm run compile` to build the extension.
4. Open in VS Code and press F5 to launch Extension Development Host.

## Configuration

Configure the extension through VS Code settings (`settings.json`):

```json
{
  "autodoc.model": "gemini-3-flash-preview",
  "autodoc.thinkingLevel": "high",
  "autodoc.mappings": [
    {
      "name": "Core",
      "source": "src/**/*.py",
      "doc": "docs/core.md"
    }
  ],
  "autodoc.contextFiles": ["README.md"],
  "autodoc.apiKey": "your-gemini-api-key"
}
```

## Usage

1. **Initialize**: Run the "Auto-Doc: Initialize" command to set up the project.
2. **Configure**: Set up mappings and API key in VS Code settings.
3. **Commit**: Make code changes and commit. The extension will automatically update documentation.

## Requirements

- VS Code with Git extension installed.
- Google Gemini API key.

## Development

- `npm run compile`: Compile TypeScript.
- `npm run watch`: Watch for changes and compile.
- Press F5 in VS Code to test the extension.