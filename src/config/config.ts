import * as vscode from "vscode";

export interface Mapping {
  name?: string;
  source: string;
  doc: string;
  exclude?: string[];
}

export interface Config {
  model: string;
  thinkingLevel: string;
  mappings: Mapping[];
  contextFiles: string[];
  apiKey?: string;
  googleCloudProjectId?: string;
  googleCloudRegion: string;
  templates: { [key: string]: string };
}

export class ConfigLoader {
  static load(): Config {
    const config = vscode.workspace.getConfiguration("autodoc");

    return {
      model: config.get("model", "gemini-3-flash-preview"),
      thinkingLevel: config.get("thinkingLevel", "high"),
      mappings: config.get("mappings", []),
      contextFiles: config.get("contextFiles", ["README.md"]),
      apiKey: config.get("apiKey", ""),
      googleCloudProjectId: config.get("googleCloudProjectId", ""),
      googleCloudRegion: config.get("googleCloudRegion", "global"),
      templates: {}, // TODO: Add template overrides if needed
    };
  }
}

export const Config = ConfigLoader;
