import minimatch from "minimatch";
import * as vscode from "vscode";
import { Config } from "./config/config";
import { DocGenerator } from "./core/docGenerator";
import { GitHandler } from "./utils/gitHandler";
import { Logger } from "./utils/logger";

let gitHandler: GitHandler | undefined;
let logger: Logger;
const lastCommits = new Map<number, string>();

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

  // Listen for Git events (if Git extension is available)
  if (gitExtension) {
    if (gitExtension.isActive) {
      setupGitListeners(context);
    } else {
      gitExtension.activate().then(() => setupGitListeners(context));
    }
  }
}

function setupGitListeners(context: vscode.ExtensionContext) {
  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension) return;

  const gitApi = gitExtension.exports.getAPI(1);

  // Listen for existing repositories
  gitApi.repositories.forEach((repo: any, index: number) => {
    registerRepoListener(repo, index, context);
  });

  // Listen for new repositories
  context.subscriptions.push(
    gitApi.onDidOpenRepository((repo: any) => {
      const index = gitApi.repositories.indexOf(repo);
      registerRepoListener(repo, index, context);
    }),
  );
}

function registerRepoListener(repo: any, index: number, context: vscode.ExtensionContext) {
  // Initialize last commit hash
  if (repo.state.HEAD?.commit) {
    lastCommits.set(index, repo.state.HEAD.commit);
  }

  context.subscriptions.push(
    repo.state.onDidChange(() => {
      const currentCommit = repo.state.HEAD?.commit;
      const lastCommit = lastCommits.get(index);

      if (currentCommit && currentCommit !== lastCommit) {
        lastCommits.set(index, currentCommit);
        syncDocs(index, true); // true indicates it's a commit trigger
      }
    }),
  );
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
      // Find template in out or src
      const outUri = vscode.Uri.joinPath(vscode.Uri.file(__dirname), "..", "templates", template);
      const srcUri = vscode.Uri.joinPath(vscode.Uri.file(__dirname), "..", "..", "src", "templates", template);

      let content: Uint8Array;
      try {
        content = await vscode.workspace.fs.readFile(outUri);
      } catch {
        try {
          content = await vscode.workspace.fs.readFile(srcUri);
        } catch (error) {
          logger.error(`Could not find template ${template} in ${outUri.fsPath} or ${srcUri.fsPath}`);
          continue;
        }
      }

      const destUri = vscode.Uri.joinPath(templatesDir, template);
      await vscode.workspace.fs.writeFile(destUri, content);
    }

    vscode.window.showInformationMessage("Auto-Doc: Project initialized!");
  } catch (error) {
    vscode.window.showErrorMessage(`Auto-Doc: Initialization failed - ${error}`);
  }
}

async function syncDocs(repoIndex?: number, isCommitTrigger: boolean = false) {
  if (!gitHandler) {
    logger.error("Auto-Doc: Git extension not available.");
    return;
  }

  const repoCount = gitHandler.getRepositoryCount();
  if (repoCount === 0) {
    logger.warn("Auto-Doc: No Git repositories found.");
    return;
  }

  // Handle all relevant repositories if no index provided (manual global sync)
  const targetRepoIndices = repoIndex !== undefined ? [repoIndex] : Array.from({ length: repoCount }, (_, i) => i);

  for (const rIndex of targetRepoIndices) {
    const repoRoot = gitHandler.getRepositoryRoot(rIndex);
    if (!repoRoot) continue;

    // Find all workspace folders within this repo
    const workspaceFoldersInRepo = vscode.workspace.workspaceFolders?.filter((folder) => folder.uri.fsPath.startsWith(repoRoot) || repoRoot.startsWith(folder.uri.fsPath));

    if (!workspaceFoldersInRepo || workspaceFoldersInRepo.length === 0) {
      logger.warn(`Auto-Doc: No workspace folders found for repository at ${repoRoot}`);
      continue;
    }

    const changedFiles = isCommitTrigger ? await gitHandler.getCommitChanges(rIndex) : gitHandler.getChangedFiles(rIndex);

    if (!changedFiles.length) {
      logger.log(`Auto-Doc: No changes detected in repository ${repoRoot}.`);
      continue;
    }

    const gitContext = gitHandler.getCommitContext(rIndex);

    // Process each workspace folder separately to avoid cross-pollution
    for (const workspaceFolder of workspaceFoldersInRepo) {
      logger.log(`Analyzing changes in folder: ${workspaceFolder.name}...`);

      const config = Config.load(workspaceFolder.uri);

      // Filter files to those within this specific workspace folder
      const folderFiles = changedFiles.filter((file) => file.startsWith(workspaceFolder.uri.fsPath));
      if (folderFiles.length === 0) {
        logger.log(`Auto-Doc: No relevant changes for folder ${workspaceFolder.name}.`);
        continue;
      }

      // Make paths relative to the workspace folder for mapping and generation
      const relativeChangedFiles = folderFiles.map((file) => path.relative(workspaceFolder.uri.fsPath, file));

      // Router Logic
      const docUpdates: { [doc: string]: string[] } = {};

      if (config.mappings) {
        for (const changedFile of relativeChangedFiles) {
          for (const mapping of config.mappings) {
            const sourceGlob = mapping.source;
            const targetDoc = mapping.doc;

            // Strip folder name if mapping is folder-prefixed
            let relativeSourceGlob = sourceGlob;
            const folderPrefix = workspaceFolder.name + "/";
            if (sourceGlob.startsWith(folderPrefix)) {
              relativeSourceGlob = sourceGlob.substring(folderPrefix.length);
            }

            if (minimatch(changedFile, relativeSourceGlob)) {
              // Check exclusions
              let isExcluded = false;
              if (mapping.exclude) {
                for (const exclude of mapping.exclude) {
                  let relativeExclude = exclude;
                  if (exclude.startsWith(folderPrefix)) {
                    relativeExclude = exclude.substring(folderPrefix.length);
                  }
                  if (minimatch(changedFile, relativeExclude)) {
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
                break; // Use the first matching mapping for this file
              }
            }
          }
        }
      }

      if (Object.keys(docUpdates).length === 0) {
        logger.log(`Auto-Doc: No relevant changes for ${workspaceFolder.name} based on mappings.`);
        continue;
      }

      // Execute Updates for this folder
      const generator = new DocGenerator(config, workspaceFolder, logger);
      for (const [docPath, sourceFiles] of Object.entries(docUpdates)) {
        logger.log(`[${workspaceFolder.name}] Updating ${docPath} with changes from: ${sourceFiles.join(", ")}`);
        await generator.updateDocs(sourceFiles, docPath, gitContext);
      }
    }
  }

  logger.log("Auto-Doc: Documentation sync complete!");
}

export function deactivate() {}
