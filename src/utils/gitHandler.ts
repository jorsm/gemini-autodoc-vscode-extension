import * as vscode from "vscode";
import { Logger } from "./logger";

export interface GitContext {
  hash: string;
  message: string;
  author: string;
  author_email: string;
  date: string;
}

export class GitHandler {
  private readonly gitApi: any;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (gitExtension?.isActive) {
      this.gitApi = gitExtension.exports.getAPI(1);
    }
  }

  getChangedFiles(repoPathOrIndex: string | number = 0): string[] {
    this.logger.log(`[GitHandler] Getting changed files for ${repoPathOrIndex}.`);
    const repo = this.getRepository(repoPathOrIndex);
    if (!repo) {
      this.logger.warn(`[GitHandler] No repository found for ${repoPathOrIndex}.`);
      return [];
    }

    try {
      const changes = repo.state.workingTreeChanges || [];
      const changedFiles = changes.filter((change: any) => change.status !== 4).map((change: any) => change.uri.fsPath);
      this.logger.log(`[GitHandler] Found ${changedFiles.length} changed files in working tree for ${repo.rootUri.fsPath}.`);
      return changedFiles;
    } catch (error) {
      this.logger.error(`[GitHandler] Error getting changed files: ${error}`);
      return [];
    }
  }

  async getCommitChanges(repoPathOrIndex: string | number = 0, hash?: string): Promise<string[]> {
    this.logger.log(`[GitHandler] Getting commit changes for ${repoPathOrIndex}, hash: ${hash || "HEAD"}.`);
    const repo = this.getRepository(repoPathOrIndex);
    if (!repo) {
      this.logger.warn(`[GitHandler] No repository found for ${repoPathOrIndex}.`);
      return [];
    }

    try {
      // If no hash provided, use HEAD
      const ref = hash || "HEAD";
      // Diff HEAD with its parent to get changes in the latest commit
      this.logger.log(`[GitHandler] Dashing diff between ${ref}~1 and ${ref} for ${repo.rootUri.fsPath}.`);
      const changes = await repo.diffBetween(`${ref}~1`, ref);
      const changedFiles = changes.map((change: any) => change.uri.fsPath);
      this.logger.log(`[GitHandler] Found ${changedFiles.length} changed files in commit ${ref} for ${repo.rootUri.fsPath}.`);
      return changedFiles;
    } catch (error) {
      this.logger.error(`[GitHandler] Error getting commit changes: ${error}`);
      return [];
    }
  }

  getCommitContext(repoPathOrIndex: string | number = 0): GitContext | undefined {
    const repo = this.getRepository(repoPathOrIndex);
    if (!repo) {
      return undefined;
    }

    try {
      const head = repo.state.HEAD;
      if (!head) return undefined;

      return {
        hash: head.commit || "",
        message: head.message || "",
        author: head.authorName || "",
        author_email: head.authorEmail || "",
        date: head.date?.toISOString() || "",
      };
    } catch (error) {
      this.logger.error(`[GitHandler] Error getting commit context: ${error}`);
      return undefined;
    }
  }

  getRepositoryCount(): number {
    return this.gitApi?.repositories.length ?? 0;
  }

  getRepositoryRoot(repoPathOrIndex: string | number): string | undefined {
    const repo = this.getRepository(repoPathOrIndex);
    return repo?.rootUri.fsPath;
  }

  private getRepository(pathOrIndex: string | number): any {
    if (typeof pathOrIndex === "number") {
      return this.gitApi?.repositories[pathOrIndex];
    }

    return this.gitApi?.repositories.find((r: any) => r.rootUri.fsPath === pathOrIndex || r.rootUri.toString() === pathOrIndex);
  }
}
