import minimatch from "minimatch";
import * as vscode from "vscode";
import { Config } from "./config/config";
import { DocGenerator } from "./core/docGenerator";
import { GitHandler } from "./utils/gitHandler";
import { Logger } from "./utils/logger";

let gitHandler: GitHandler | undefined;
let logger: Logger;

export function activate(context: vscode.ExtensionContext) {
  // Create output channel for the extension
  const outputChannel = vscode.window.createOutputChannel("Auto-Doc");
  logger = new Logger(outputChannel);

  logger.log("Auto-Doc extension is now active!");

  // Initialize Git handler if Git extension is available
  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (gitExtension) {
    gitHandler = new GitHandler(logger);
  }

  // Register commands
  let initDisposable = vscode.commands.registerCommand("autodoc.init", async () => {
    await initProject();
  });

  let syncDisposable = vscode.commands.registerCommand("autodoc.sync", async () => {
    await syncDocs();
  });

  context.subscriptions.push(initDisposable, syncDisposable, outputChannel);

  // Listen for Git events (if Git extension is active)
  if (gitExtension && gitExtension.isActive) {
    const gitApi = gitExtension.exports.getAPI(1);
    gitApi.repositories.forEach((repo: any, index: number) => {
      context.subscriptions.push(
        repo.state.onDidChange(() => {
          // Trigger sync on commit for this specific repo
          if (repo.state.HEAD?.commit) {
            syncDocs(index);
          }
        }),
      );
    });
  }
}

async function initProject() {
  vscode.window.showInformationMessage("Auto-Doc: Initializing project...");

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder open.");
    return;
  }

  // If multiple folders, let user choose
  let targetFolder: vscode.WorkspaceFolder;
  if (workspaceFolders.length === 1) {
    targetFolder = workspaceFolders[0];
  } else {
    const selected = await vscode.window.showQuickPick(
      workspaceFolders.map((folder) => ({
        label: folder.name,
        description: folder.uri.fsPath,
        folder,
      })),
      { placeHolder: "Select the workspace folder to initialize Auto-Doc" },
    );
    if (!selected) {
      return;
    }
    targetFolder = selected.folder;
  }

  const autodocDir = vscode.Uri.joinPath(targetFolder.uri, ".autodoc");
  const templatesDir = vscode.Uri.joinPath(autodocDir, "templates");

  try {
    await vscode.workspace.fs.createDirectory(autodocDir);
    await vscode.workspace.fs.createDirectory(templatesDir);

    // Copy default templates
    const defaultTemplates = ["systemInstruction.hbs", "docPrompt.hbs", "docSkeleton.hbs"];

    for (const template of defaultTemplates) {
      const srcUri = vscode.Uri.joinPath(vscode.Uri.file(__dirname), "..", "templates", template);
      const destUri = vscode.Uri.joinPath(templatesDir, template);
      const content = await vscode.workspace.fs.readFile(srcUri);
      await vscode.workspace.fs.writeFile(destUri, content);
    }

    vscode.window.showInformationMessage("Auto-Doc: Project initialized!");
  } catch (error) {
    vscode.window.showErrorMessage(`Auto-Doc: Initialization failed - ${error}`);
  }
}

async function syncDocs(repoIndex?: number) {
  if (!gitHandler) {
    vscode.window.showErrorMessage("Auto-Doc: Git extension not available.");
    return;
  }

  const repoCount = gitHandler.getRepositoryCount();
  if (repoCount === 0) {
    vscode.window.showErrorMessage("Auto-Doc: No Git repositories found.");
    return;
  }

  // If repoIndex not provided (manual sync), use first repo or let user choose
  if (repoIndex === undefined) {
    if (repoCount === 1) {
      repoIndex = 0;
    } else {
      const repoOptions = [];
      for (let i = 0; i < repoCount; i++) {
        const root = gitHandler.getRepositoryRoot(i);
        repoOptions.push({
          label: `Repository ${i + 1}`,
          description: root,
          index: i,
        });
      }
      const selected = await vscode.window.showQuickPick(repoOptions, {
        placeHolder: "Select the repository to sync",
      });
      if (!selected) return;
      repoIndex = selected.index;
    }
  }

  const repoRoot = gitHandler.getRepositoryRoot(repoIndex);
  if (!repoRoot) {
    vscode.window.showErrorMessage("Auto-Doc: Could not determine repository root.");
    return;
  }

  // Find the corresponding workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.find((folder) => repoRoot.startsWith(folder.uri.fsPath));
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("Auto-Doc: Repository root not in workspace folders.");
    return;
  }

  vscode.window.showInformationMessage(`Auto-Doc: Analyzing changes in ${workspaceFolder.name}...`);

  try {
    const config = Config.load();
    const changedFiles = gitHandler.getChangedFiles(repoIndex);
    const gitContext = gitHandler.getCommitContext(repoIndex);

    if (!changedFiles.length) {
      vscode.window.showInformationMessage("Auto-Doc: No changes detected.");
      return;
    }

    // Filter to relative paths from repo root
    const relativeChangedFiles = changedFiles.map((file) => (file.startsWith(repoRoot) ? file.substring(repoRoot.length + 1) : file));

    // Router Logic
    const docUpdates: { [doc: string]: string[] } = {};

    if (config.mappings) {
      for (const changedFile of relativeChangedFiles) {
        for (const mapping of config.mappings) {
          const sourceGlob = mapping.source;
          const targetDoc = mapping.doc;

          if (minimatch(changedFile, sourceGlob)) {
            // Check exclusions
            let isExcluded = false;
            if (mapping.exclude) {
              for (const exclude of mapping.exclude) {
                if (minimatch(changedFile, exclude)) {
                  isExcluded = true;
                  break;
                }
              }
            }

            if (!isExcluded) {
              if (!docUpdates[targetDoc]) {
                docUpdates[targetDoc] = [];
              }
              docUpdates[targetDoc].push(changedFile);
              break; // Priority rule
            }
          }
        }
      }
    }

    if (Object.keys(docUpdates).length === 0) {
      vscode.window.showInformationMessage("Auto-Doc: No relevant changes detected based on mappings.");
      return;
    }

    // Execute Updates
    const generator = new DocGenerator(config, workspaceFolder, logger);
    for (const [docTarget, sources] of Object.entries(docUpdates)) {
      vscode.window.showInformationMessage(`Auto-Doc: Updating ${docTarget} with sources: ${sources.join(", ")}`);
      await generator.updateDocs(sources, docTarget, gitContext);
    }

    vscode.window.showInformationMessage("Auto-Doc: Documentation updated!");
  } catch (error) {
    vscode.window.showErrorMessage(`Auto-Doc: Error during sync - ${error}`);
  }
}

export function deactivate() {}
