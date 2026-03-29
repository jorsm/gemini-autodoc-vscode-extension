import * as fs from "fs";
import Handlebars from "handlebars";
import * as path from "path";
import * as vscode from "vscode";
import { Config } from "../config/config";
import { Logger } from "../utils/logger";
import { GeminiClient } from "./geminiClient";

export interface GitContext {
  hash?: string;
  message?: string;
  author?: string;
  author_email?: string;
  date?: string;
}

export class DocGenerator {
  private readonly config: Config;
  private readonly workspaceFolder: vscode.WorkspaceFolder;
  private readonly client: GeminiClient;
  private readonly logger: Logger;

  constructor(config: Config, workspaceFolder: vscode.WorkspaceFolder, logger: Logger) {
    this.config = config;
    this.workspaceFolder = workspaceFolder;
    this.logger = logger;
    this.client = new GeminiClient(config, logger);
  }

  async updateDocs(sourceFiles: string[], docTarget: string, gitContext?: GitContext): Promise<void> {
    this.logger.log(`[DocGenerator] Starting update for target ${docTarget} with ${sourceFiles.length} source files.`);
    // Multi-root handling: check if docTarget starts with folder name and strip it
    let relativeDocTarget = docTarget;
    const folderPrefix = this.workspaceFolder.name + "/";
    if (docTarget.startsWith(folderPrefix)) {
      relativeDocTarget = docTarget.substring(folderPrefix.length);
      this.logger.log(`[DocGenerator] Stripped folder prefix from ${docTarget} to get relative path ${relativeDocTarget}`);
    }

    const absoluteDocTarget = path.resolve(this.workspaceFolder.uri.fsPath, relativeDocTarget);
    try {
      // 1. Source Loading
      // sourceFiles are already relative to this.workspaceFolder.uri.fsPath
      this.logger.log(`[DocGenerator] Loading ${sourceFiles.length} source files...`);
      const sourceContents = await this.loadSourceFiles(sourceFiles);
      this.logger.log(`[DocGenerator] Successfully loaded ${sourceContents.length} source files.`);

      // 2. Context Gathering
      this.logger.log(`[DocGenerator] Loading context files...`);
      const contextContents = await this.loadContextFiles();
      this.logger.log(`[DocGenerator] Successfully loaded ${contextContents.length} context files.`);

      // 3. Content Preparation
      let currentContent = "";
      if (await this.fileExists(absoluteDocTarget)) {
        this.logger.log(`[DocGenerator] Target file ${absoluteDocTarget} exists. Reading current content.`);
        currentContent = await this.readFile(absoluteDocTarget);
      } else {
        this.logger.log(`[DocGenerator] Target file ${absoluteDocTarget} does not exist. Generating skeleton.`);
        currentContent = await this.generateSkeleton(relativeDocTarget);
      }

      // 4. Prompt Construction
      this.logger.log(`[DocGenerator] Rendering templates...`);
      const systemInstruction = await this.renderTemplate("systemInstruction", {
        docTarget: relativeDocTarget,
        gitContext,
      });

      const prompt = await this.renderTemplate("docPrompt", {
        sourceContents,
        contextContents,
        currentContent,
        docTarget: relativeDocTarget,
        gitContext,
      });
      this.logger.log(`[DocGenerator] Templates rendered. Prompt length: ${prompt.length} characters.`);

      // 5. AI Generation
      this.logger.log(`[DocGenerator] Calling Gemini AI for content generation...`);
      const generatedContent = await this.client.generateDocumentation(prompt, systemInstruction, this.config.thinkingLevel);
      this.logger.log(`[DocGenerator] AI Generation complete. Received ${generatedContent.length} characters.`);

      // 6. Post-Processing and Write
      this.logger.log(`[DocGenerator] Writing generated content to ${absoluteDocTarget}...`);
      await this.writeFile(absoluteDocTarget, generatedContent);
      this.logger.log(`[DocGenerator] Successfully updated ${docTarget}.`);
    } catch (error) {
      this.logger.error(`[DocGenerator] Error: ${error}`);
      throw new Error(`DocGenerator error: ${error}`);
    }
  }

  private async loadSourceFiles(filePaths: string[]): Promise<string[]> {
    this.logger.log(`[DocGenerator] Loading ${filePaths.length} source files.`);
    const contents: string[] = [];
    for (const filePath of filePaths) {
      try {
        // Resolve path relative to THIS workspace folder
        const absolutePath = path.resolve(this.workspaceFolder.uri.fsPath, filePath);
        this.logger.log(`[DocGenerator] Reading source file: ${filePath} (absolute: ${absolutePath})`);
        const content = await this.readFile(absolutePath);
        contents.push(`## ${filePath}\n\n\`\`\`\n${content}\n\`\`\`\n`);
      } catch (error) {
        this.logger.warn(`[DocGenerator] Failed to load source file ${filePath} in ${this.workspaceFolder.name}: ${error}`);
      }
    }
    return contents;
  }

  private async loadContextFiles(): Promise<string[]> {
    this.logger.log(`[DocGenerator] Loading ${this.config.contextFiles.length} context files.`);
    const contents: string[] = [];
    for (const filePath of this.config.contextFiles) {
      try {
        // Multi-root handling: try to resolve path against all workspace folders
        let absolutePath: string | undefined;

        if (path.isAbsolute(filePath)) {
          absolutePath = filePath;
        } else {
          // Check if it starts with any workspace folder name
          const folders = vscode.workspace.workspaceFolders || [];
          for (const folder of folders) {
            const prefix = folder.name + "/";
            if (filePath.startsWith(prefix)) {
              absolutePath = path.resolve(folder.uri.fsPath, filePath.substring(prefix.length));
              this.logger.log(`[DocGenerator] Context file ${filePath} resolved via folder ${folder.name} to ${absolutePath}`);
              break;
            }
          }

          // Fallback to relative to current folder
          if (!absolutePath) {
            absolutePath = path.resolve(this.workspaceFolder.uri.fsPath, filePath);
            this.logger.log(`[DocGenerator] Context file ${filePath} resolved relative to ${this.workspaceFolder.name} to ${absolutePath}`);
          }
        }

        if (fs.existsSync(absolutePath)) {
          this.logger.log(`[DocGenerator] Reading context file: ${absolutePath}`);
          const content = await this.readFile(absolutePath);
          contents.push(`## ${filePath}\n\n${content}\n`);
        } else {
          this.logger.warn(`[DocGenerator] Context file not found: ${absolutePath}`);
        }
      } catch (error) {
        this.logger.warn(`[DocGenerator] Failed to load context file ${filePath}: ${error}`);
      }
    }
    return contents;
  }

  private async generateSkeleton(docTarget: string): Promise<string> {
    return await this.renderTemplate("docSkeleton", { docTarget });
  }

  private async renderTemplate(templateName: string, data: any): Promise<string> {
    const templatePath = this.getTemplatePath(templateName);
    const templateContent = await this.readFile(templatePath);
    const template = Handlebars.compile(templateContent);
    return template(data);
  }

  private getTemplatePath(templateName: string): string {
    // Priority: configured > local > internal
    const configured = this.config.templates[templateName];
    if (configured && fs.existsSync(configured)) {
      return configured;
    }

    const localPath = path.join(this.workspaceFolder.uri.fsPath, ".autodoc", "templates", `${templateName}.hbs`);
    if (fs.existsSync(localPath)) {
      return localPath;
    }

    // Internal fallback: search in out/templates and src/templates
    const internalPaths = [
      path.join(__dirname, "..", "templates", `${templateName}.hbs`),
      path.join(__dirname, "..", "..", "src", "templates", `${templateName}.hbs`), // Fallback for dev mode
    ];

    for (const internalPath of internalPaths) {
      if (fs.existsSync(internalPath)) {
        return internalPath;
      }
    }

    throw new Error(`Template ${templateName} not found in internal paths: ${internalPaths.join(", ")}`);
  }

  private async readFile(filePath: string): Promise<string> {
    const uri = vscode.Uri.file(filePath);
    const content = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(content).toString("utf8");
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }
}
