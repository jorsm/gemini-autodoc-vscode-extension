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
    const absoluteDocTarget = path.resolve(this.workspaceFolder.uri.fsPath, docTarget);
    try {
      // 1. Source Loading
      const sourceContents = await this.loadSourceFiles(sourceFiles);

      // 2. Context Gathering
      const contextContents = await this.loadContextFiles();

      // 3. Content Preparation
      let currentContent = "";
      if (await this.fileExists(absoluteDocTarget)) {
        currentContent = await this.readFile(absoluteDocTarget);
      } else {
        currentContent = await this.generateSkeleton(docTarget);
      }

      // 4. Prompt Construction
      const systemInstruction = await this.renderTemplate("systemInstruction", {
        docTarget,
        gitContext,
      });

      const prompt = await this.renderTemplate("docPrompt", {
        sourceContents,
        contextContents,
        currentContent,
        docTarget,
        gitContext,
      });

      // 5. AI Generation
      const generatedContent = await this.client.generateDocumentation(prompt, systemInstruction, this.config.thinkingLevel);

      // 6. Post-Processing and Write
      await this.writeFile(absoluteDocTarget, generatedContent);
    } catch (error) {
      throw new Error(`DocGenerator error: ${error}`);
    }
  }

  private async loadSourceFiles(filePaths: string[]): Promise<string[]> {
    const contents: string[] = [];
    for (const filePath of filePaths) {
      try {
        const absolutePath = path.resolve(this.workspaceFolder.uri.fsPath, filePath);
        const content = await this.readFile(absolutePath);
        contents.push(`## ${filePath}\n\n\`\`\`\n${content}\n\`\`\`\n`);
      } catch (error) {
        this.logger.warn(`Failed to load source file ${filePath}: ${error}`);
      }
    }
    return contents;
  }

  private async loadContextFiles(): Promise<string[]> {
    const contents: string[] = [];
    for (const filePath of this.config.contextFiles) {
      try {
        const absolutePath = path.resolve(this.workspaceFolder.uri.fsPath, filePath);
        const content = await this.readFile(absolutePath);
        contents.push(`## ${filePath}\n\n${content}\n`);
      } catch (error) {
        this.logger.warn(`Failed to load context file ${filePath}: ${error}`);
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

    // Internal default
    return path.join(__dirname, "..", "templates", `${templateName}.hbs`);
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
